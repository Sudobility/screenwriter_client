/**
 * Framework-free client for the ViaInk sync WebSocket (spec 03 §2). Uses the global
 * `WebSocket`, the shared frame codec from screenwriter_types and V2 Yjs encoding.
 *
 * Epoch changes are *reported*, never handled: on `epochChanged`, `subscribeError EPOCH_MISMATCH`,
 * `reject EPOCH_MISMATCH` or close 4409 the document goes `stale` and an `epochChanged` event fires.
 * It is not resubscribed until the caller calls `subscribe` for it again (the rebase is the lib's job).
 */
import * as Y from "yjs";
import {
  decodeFrame,
  encodeFrame,
  SYNC_AUTH_TIMEOUT_MS,
  SYNC_CLOSE_CODES,
  SYNC_HEARTBEAT_MS,
  type SyncFrame,
} from "@sudobility/screenwriter_types";
import { decodeAwareness, encodeAwareness, RemoteAwareness } from "./awareness";
import { backoffDelay } from "./backoff";

type Bytes = Uint8Array<ArrayBuffer>;

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type DocSyncStatus = "syncing" | "synced";
/** Subscription lifecycle: `stale` = epoch changed (waiting for the caller), `failed` = server refused. */
export type SubscriptionState = "pending" | "active" | "stale" | "failed";

export interface SyncClientOptions {
  /** Full `ws(s)://.../api/v1/sync` URL (`ScreenwriterClient.syncUrl()`). */
  url: string;
  /** Token supplier; `forceRefresh` is true on the single retry after close 4401. Null = signed out. */
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  /**
   * `firebase` (default; also the dev bypass and, for MCP, `apikey` is server-side only) or `link`: then `getToken` must return
   * a `linkSession` (`ScreenwriterClient.unlockShareLink`), which lasts 15 minutes: the client re-sends it every 10 minutes, so
   * `getToken` should renew it. A link session opens only its link's target, as viewer or (comment link, signed in) commenter.
   */
  scheme?: "firebase" | "link";
  /** Unlock-session token for a locked document (`ScreenwriterClient.createUnlockSession`), sent in the auth frame. */
  getUnlockToken?: () => string | null;
  WebSocketImpl?: typeof WebSocket;
  deviceId?: string;
  installId?: string;
  clientVersion?: string;
  /** Document schema version this client writes (writing_core `DOC_SCHEMA_VERSION`). */
  schemaVersion?: number;
  authTimeoutMs?: number;
  /** Remote peers not heard from for this long are dropped. Default 30 s. */
  awarenessTimeoutMs?: number;
  /** Injectable for tests: returns a delay in [0, 1). */
  random?: () => number;
}

export interface SubscribeOptions {
  /** The epoch the doc's content belongs to (from REST metadata or the previous rebase). */
  epoch: number;
  mode?: "edit" | "view";
  /** Called with all live remote peers whenever the set or a state changes. */
  onAwareness?: (remoteStates: Map<number, unknown>) => void;
}

export interface EpochChangedEvent {
  documentId: string;
  /** The live epoch, or null when we only learned of the change from close code 4409. */
  liveEpoch: number | null;
  reason?: string;
  byUserId?: string;
  snapshotId?: string;
}

export interface SyncClientEvents {
  status: ConnectionStatus;
  docStatus: { documentId: string; status: DocSyncStatus };
  epochChanged: EpochChangedEvent;
  authError: { code: string; message: string };
  subscribeError: { documentId: string; code: string; detail?: unknown };
  rejected: { documentId: string; clientSeq: number; code: string; detail?: unknown };
  /**
   * The server re-resolved your role on this document (member role change, grant change or revoke). `role: "none"` means
   * access is gone: the server closes the socket next (4403), so expect `stopped`. `markPermissions` says what the role may write.
   */
  roleChanged: { documentId: string; role: string; markPermissions?: unknown };
  documentDeleted: { documentId: string; byUserId: string };
  /** Fatal: the client will not reconnect on its own. */
  stopped: { reason: string; code?: number };
  closed: { code: number; reason: string; willReconnect: boolean };
  error: { message: string };
}

export interface DocSubscription {
  readonly documentId: string;
  readonly status: DocSyncStatus;
  readonly state: SubscriptionState;
  /** Updates sent but not yet acknowledged as durable. */
  readonly unackedCount: number;
  setLocalAwareness(state: unknown): void;
  unsubscribe(): void;
}

interface Sub {
  documentId: string;
  doc: Y.Doc;
  epoch: number;
  mode: "edit" | "view";
  channelId: number;
  state: SubscriptionState;
  status: DocSyncStatus;
  remote: RemoteAwareness;
  localAwareness: unknown;
  lastAwarenessSent: number;
  onAwareness: ((s: Map<number, unknown>) => void) | undefined;
  clientSeq: number;
  unacked: Set<number>;
  onDocUpdate: (update: Uint8Array, origin: unknown) => void;
}

const REAUTH_MS = 50 * 60_000;
/** A link session lasts 15 minutes: renew well before that. */
const LINK_REAUTH_MS = 10 * 60_000;
const HEALTHY_MS = 60_000;
const MALFORMED_WINDOW_MS = 10 * 60_000;
/** Client-initiated close for our own timeouts (client codes must be 1000 or 3000-4999). */
const CLIENT_TIMEOUT_CLOSE = 4000;

export class SyncClient {
  private readonly opts: Required<Pick<SyncClientOptions, "authTimeoutMs" | "awarenessTimeoutMs">> & SyncClientOptions;
  private readonly listeners = new Map<string, Set<(e: never) => void>>();
  private readonly subs = new Map<string, Sub>();
  private readonly byChannel = new Map<number, Sub>();
  private readonly remoteOrigin = { remote: true };
  private nextChannel = 1;

  private ws: WebSocket | null = null;
  private _status: ConnectionStatus = "disconnected";
  private stoppedReason: string | null = null;
  private manualStop = false;
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private authTimer: ReturnType<typeof setTimeout> | null = null;
  private hbTimer: ReturnType<typeof setInterval> | null = null;
  private healthyTimer: ReturnType<typeof setTimeout> | null = null;
  private reauthTimer: ReturnType<typeof setInterval> | null = null;
  private awarenessTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatMs = SYNC_HEARTBEAT_MS;
  private lastRecv = 0;
  private lastSent = 0;
  private authFailures = 0;
  private forceRefreshNext = false;
  private malformedAt: number[] = [];
  private shutdownDelayMs: number | null = null;
  private waiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
  private onlineListener: (() => void) | null = null;

  constructor(options: SyncClientOptions) {
    this.opts = { authTimeoutMs: SYNC_AUTH_TIMEOUT_MS, awarenessTimeoutMs: 30_000, ...options };
  }

  // ─── public API ──────────────────────────────────────────────────────────

  get status(): ConnectionStatus {
    return this._status;
  }

  on<E extends keyof SyncClientEvents>(event: E, fn: (payload: SyncClientEvents[E]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn as (e: never) => void);
    return () => set.delete(fn as (e: never) => void);
  }

  /** Start connecting (idempotent). Resolves once authenticated; rejects if the client stops or is disconnected. */
  connect(): Promise<void> {
    this.manualStop = false;
    this.stoppedReason = null;
    if (this.subs.size > 0) this.startAwarenessTimer();
    if (this._status === "connected") return Promise.resolve();
    const p = new Promise<void>((resolve, reject) => this.waiters.push({ resolve, reject }));
    if (!this.ws && !this.reconnectTimer) this.open();
    this.listenOnline();
    return p;
  }

  /**
   * Subscribe `doc` to the server document. Runs the Yjs two-step, applies remote updates with an
   * internal origin and sends only local-origin updates. Subscribing an already-subscribed (or stale)
   * document replaces the old subscription: this is how the caller resumes after an epoch change.
   */
  subscribe(documentId: string, doc: Y.Doc, options: SubscribeOptions): DocSubscription {
    this.unsubscribe(documentId);
    const sub: Sub = {
      documentId,
      doc,
      epoch: options.epoch,
      mode: options.mode ?? "edit",
      channelId: this.nextChannel++,
      state: "pending",
      status: "syncing",
      remote: new RemoteAwareness(this.opts.awarenessTimeoutMs),
      localAwareness: null,
      lastAwarenessSent: 0,
      onAwareness: options.onAwareness,
      clientSeq: 0,
      unacked: new Set(),
      onDocUpdate: (update, origin) => this.onLocalUpdate(sub, update, origin),
    };
    doc.on("updateV2", sub.onDocUpdate);
    this.subs.set(documentId, sub);
    this.byChannel.set(sub.channelId, sub);
    this.startAwarenessTimer();
    if (this._status === "connected") this.sendSubscribe(sub);
    else if (!this.ws && !this.reconnectTimer && !this.manualStop && !this.stoppedReason) {
      void this.connect().catch(() => undefined);
    }
    const client = this;
    return {
      documentId,
      get status() {
        return sub.status;
      },
      get state() {
        return sub.state;
      },
      get unackedCount() {
        return sub.unacked.size;
      },
      setLocalAwareness: s => client.setLocalAwareness(documentId, s),
      unsubscribe: () => {
        if (client.subs.get(documentId) === sub) client.unsubscribe(documentId);
      },
    };
  }

  unsubscribe(documentId: string): void {
    const sub = this.subs.get(documentId);
    if (!sub) return;
    if (sub.state === "active") {
      if (sub.localAwareness !== null) this.sendAwareness(sub, null);
      this.send({ channelId: 0, type: "unsubscribe", payload: { channelId: sub.channelId } });
    }
    sub.doc.off("updateV2", sub.onDocUpdate);
    sub.remote.clear();
    this.subs.delete(documentId);
    this.byChannel.delete(sub.channelId);
    if (this.subs.size === 0) this.clearAwarenessTimer();
  }

  getDocStatus(documentId: string): DocSyncStatus | null {
    return this.subs.get(documentId)?.status ?? null;
  }

  /** Publish this client's presence (cursor, name, ...) for one document. `null` clears it. */
  setLocalAwareness(documentId: string, state: unknown): void {
    const sub = this.subs.get(documentId);
    if (!sub) return;
    sub.localAwareness = state;
    if (sub.state === "active") this.sendAwareness(sub, state);
  }

  /** Close for good (no reconnect). Open documents stay registered; `connect()` resumes them. */
  disconnect(): void {
    this.manualStop = true;
    this.clearReconnect();
    for (const sub of this.subs.values()) {
      if (sub.state === "active" && sub.localAwareness !== null) this.sendAwareness(sub, null);
    }
    const ws = this.ws;
    if (ws) this.closeSocket(ws, 1000, "client disconnect");
    else this.setStatus("disconnected");
    this.rejectWaiters(new Error("disconnected"));
    this.stopTimers();
    this.clearAwarenessTimer();
    this.unlistenOnline();
  }

  // ─── socket lifecycle ────────────────────────────────────────────────────

  private open(): void {
    const Impl = this.opts.WebSocketImpl ?? globalThis.WebSocket;
    if (!Impl) {
      this.stop("NO_WEBSOCKET");
      return;
    }
    this.setStatus("connecting");
    // No subprotocol offer: the server does not echo `fadewright-sync.v1`, and browsers fail the
    // connection when an offered protocol is not selected.
    const ws = new Impl(this.opts.url);
    ws.binaryType = "arraybuffer";
    this.ws = ws;
    ws.onopen = () => void this.onOpen(ws);
    ws.onmessage = ev => this.onMessage(ws, ev.data);
    ws.onerror = () => {
      if (ws === this.ws) this.emit("error", { message: "socket error" });
    };
    ws.onclose = ev => this.onClose(ws, ev.code, ev.reason);
  }

  private async onOpen(ws: WebSocket): Promise<void> {
    if (ws !== this.ws) return;
    let token: string | null;
    try {
      token = await this.opts.getToken(this.forceRefreshNext);
    } catch (e) {
      this.emit("error", { message: `getToken failed: ${e instanceof Error ? e.message : String(e)}` });
      this.closeSocket(ws, CLIENT_TIMEOUT_CLOSE, "token error");
      return;
    }
    this.forceRefreshNext = false;
    if (ws !== this.ws) return;
    if (!token) {
      this.stop("NO_TOKEN");
      this.closeSocket(ws, 1000, "signed out");
      return;
    }
    this.rawSend(ws, {
      channelId: 0,
      type: "auth",
      payload: {
        scheme: this.opts.scheme ?? "firebase",
        token,
        deviceId: this.opts.deviceId ?? "web",
        installId: this.opts.installId ?? "web",
        clientVersion: this.opts.clientVersion ?? "screenwriter_client/0.1.0",
        schemaVersion: this.opts.schemaVersion ?? 1,
        ...(this.opts.getUnlockToken?.() ? { unlockToken: this.opts.getUnlockToken()! } : {}),
      },
    });
    this.authTimer = setTimeout(() => {
      this.emit("error", { message: "auth timeout" });
      this.closeSocket(ws, CLIENT_TIMEOUT_CLOSE, "auth timeout");
    }, this.opts.authTimeoutMs);
  }

  private onMessage(ws: WebSocket, data: unknown): void {
    if (ws !== this.ws) return;
    this.lastRecv = Date.now();
    if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) return; // text frames are not part of the protocol
    let frame: SyncFrame;
    try {
      frame = decodeFrame(data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    } catch (e) {
      this.emit("error", { message: `bad frame: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }
    this.handleFrame(frame);
  }

  private handleFrame(frame: SyncFrame): void {
    switch (frame.type) {
      case "authOk": {
        this.clearAuthTimer();
        this.authFailures = 0;
        this.heartbeatMs = frame.payload.heartbeatMs || SYNC_HEARTBEAT_MS;
        this.lastRecv = this.lastSent = Date.now();
        this.setStatus("connected");
        this.startConnectionTimers();
        for (const w of this.waiters.splice(0)) w.resolve();
        for (const sub of this.subs.values()) if (sub.state === "pending") this.sendSubscribe(sub);
        return;
      }
      case "authError":
        this.emit("authError", frame.payload);
        return; // the server closes the socket next (4401 / 4403); onClose decides
      case "ping":
      case "pong":
        return; // liveness only, never answered
      case "serverShutdown":
        this.shutdownDelayMs = frame.payload.reconnectAfterMs;
        return;
      default:
    }
    const sub = this.byChannel.get(frame.channelId);
    if (!sub) return;
    switch (frame.type) {
      case "subscribed":
        sub.state = "active";
        sub.epoch = frame.payload.epoch;
        if (sub.localAwareness !== null) this.sendAwareness(sub, sub.localAwareness);
        return;
      case "subscribeError": {
        const { code, detail } = frame.payload;
        if (code === "EPOCH_MISMATCH") {
          this.markStale(sub, { documentId: sub.documentId, liveEpoch: typeof detail === "number" ? detail : null });
        } else {
          sub.state = "failed";
          this.emit("subscribeError", { documentId: sub.documentId, code, detail });
        }
        return;
      }
      case "syncStep1":
        this.send({
          channelId: sub.channelId,
          type: "syncStep2",
          payload: Y.encodeStateAsUpdateV2(sub.doc, frame.payload) as Bytes,
        });
        return;
      case "syncStep2":
        this.applyRemote(sub, frame.payload);
        this.setDocStatus(sub, "synced");
        return;
      case "update":
        this.applyRemote(sub, frame.payload.update);
        return;
      case "ack":
        sub.unacked.delete(frame.payload.clientSeq);
        return;
      case "reject": {
        const { clientSeq, code, detail } = frame.payload;
        sub.unacked.delete(clientSeq);
        if (code === "EPOCH_MISMATCH") {
          this.markStale(sub, { documentId: sub.documentId, liveEpoch: typeof detail === "number" ? detail : null });
        } else {
          this.emit("rejected", { documentId: sub.documentId, clientSeq, code, detail });
        }
        return;
      }
      case "epochChanged":
        this.markStale(sub, {
          documentId: sub.documentId,
          liveEpoch: frame.payload.newEpoch,
          reason: frame.payload.reason,
          byUserId: frame.payload.byUserId,
          ...(frame.payload.snapshotId ? { snapshotId: frame.payload.snapshotId } : {}),
        });
        return;
      case "awareness": {
        const msg = decodeAwareness(frame.payload);
        if (!msg || msg.clientId === sub.doc.clientID) return;
        const isNew = sub.remote.update(msg.clientId, msg.state);
        sub.onAwareness?.(sub.remote.states());
        // The server never replays awareness: introduce ourselves to a peer we just met.
        if (isNew && sub.localAwareness !== null) this.sendAwareness(sub, sub.localAwareness);
        return;
      }
      case "roleChanged":
        this.emit("roleChanged", { documentId: sub.documentId, role: frame.payload.role, markPermissions: frame.payload.markPermissions });
        return;
      case "documentDeleted":
        sub.state = "failed";
        this.emit("documentDeleted", { documentId: sub.documentId, byUserId: frame.payload.byUserId });
        return;
      default:
    }
  }

  private onClose(ws: WebSocket, code: number, reason: string): void {
    if (ws !== this.ws) return;
    this.ws = null;
    this.stopTimers();
    this.clearAuthTimer();
    for (const sub of this.subs.values()) {
      if (sub.state === "active") sub.state = "pending";
      if (sub.status !== "syncing") this.setDocStatus(sub, "syncing");
      sub.unacked.clear(); // the two-step on resubscribe re-sends whatever the server lacks
      if (sub.remote.clear()) sub.onAwareness?.(sub.remote.states());
    }
    this.setStatus("disconnected");
    const shutdownDelay = this.shutdownDelayMs;
    this.shutdownDelayMs = null;

    if (this.manualStop) {
      this.emit("closed", { code, reason, willReconnect: false });
      return;
    }

    let delay: number | null = this.backoff(); // null = do not reconnect
    switch (code) {
      case SYNC_CLOSE_CODES.GOING_AWAY:
        if (shutdownDelay !== null) delay = shutdownDelay + Math.floor(this.rand() * 1000);
        break;
      case SYNC_CLOSE_CODES.MALFORMED_FRAME: {
        const now = Date.now();
        this.malformedAt = this.malformedAt.filter(t => now - t < MALFORMED_WINDOW_MS).concat(now);
        if (this.malformedAt.length >= 3) delay = this.fatal("SYNC_ERROR", code);
        break;
      }
      case SYNC_CLOSE_CODES.AUTH_TIMEOUT_OR_INVALID:
        if (++this.authFailures === 1) {
          this.forceRefreshNext = true; // refresh the token once, then retry right away
          delay = 0;
        } else {
          delay = this.fatal("AUTH_FAILED", code);
        }
        break;
      case SYNC_CLOSE_CODES.ACCOUNT_DISABLED_OR_DEVICE_REVOKED:
        delay = this.fatal("ACCOUNT_DISABLED_OR_DEVICE_REVOKED", code);
        break;
      case SYNC_CLOSE_CODES.PROTOCOL_UNSUPPORTED:
        delay = this.fatal("PROTOCOL_UNSUPPORTED", code);
        break;
      case SYNC_CLOSE_CODES.EPOCH_CHANGED:
        // The epochChanged frame normally arrived first; cover documents it did not name.
        for (const sub of this.subs.values()) {
          if (sub.state !== "stale" && sub.state !== "failed") {
            this.markStale(sub, { documentId: sub.documentId, liveEpoch: null });
          }
        }
        this.attempt = 0;
        delay = Math.floor(this.rand() * 500);
        break;
      case SYNC_CLOSE_CODES.RATE_LIMITED:
        delay = Math.max(5000, backoffDelay(this.attempt + 3, () => this.rand()));
        break;
      default: // 1000, 1006, 4408, 4413, ... : plain backoff
    }
    this.emit("closed", { code, reason, willReconnect: delay !== null });
    if (delay === null) {
      this.rejectWaiters(new Error(`stopped: ${this.stoppedReason ?? code}`));
      return;
    }
    this.scheduleReconnect(delay);
  }

  // ─── reconnect, heartbeat ────────────────────────────────────────────────

  private rand(): number {
    return (this.opts.random ?? Math.random)();
  }

  private backoff(): number {
    return backoffDelay(this.attempt, () => this.rand());
  }

  private fatal(reason: string, code: number): null {
    this.stop(reason, code);
    return null;
  }

  private stop(reason: string, code?: number): void {
    this.stoppedReason = reason;
    this.setStatus("error");
    this.emit("stopped", code === undefined ? { reason } : { reason, code });
    this.rejectWaiters(new Error(`stopped: ${reason}`));
  }

  private scheduleReconnect(delay: number): void {
    this.clearReconnect();
    this.attempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualStop && !this.stoppedReason) this.open();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private startConnectionTimers(): void {
    this.stopTimers();
    this.healthyTimer = setTimeout(() => (this.attempt = 0), HEALTHY_MS);
    const tick = Math.max(500, Math.floor(this.heartbeatMs / 5));
    this.hbTimer = setInterval(() => {
      const ws = this.ws;
      if (!ws) return;
      const now = Date.now();
      if (now - this.lastRecv > 2.5 * this.heartbeatMs) {
        this.closeSocket(ws, SYNC_CLOSE_CODES.HEARTBEAT_TIMEOUT, "heartbeat timeout");
      } else if (now - this.lastSent >= this.heartbeatMs) {
        this.send({ channelId: 0, type: "ping", payload: { t: now } });
      }
    }, tick);
    this.reauthTimer = setInterval(() => {
      void this.opts.getToken(false).then(token => {
        if (token) this.send({ channelId: 0, type: "reauth", payload: { token } });
      }, () => undefined);
    }, this.opts.scheme === "link" ? LINK_REAUTH_MS : REAUTH_MS);
  }

  private stopTimers(): void {
    for (const t of [this.healthyTimer]) if (t) clearTimeout(t);
    for (const t of [this.hbTimer, this.reauthTimer]) if (t) clearInterval(t);
    this.healthyTimer = this.hbTimer = this.reauthTimer = null;
  }

  private clearAwarenessTimer(): void {
    if (this.awarenessTimer) clearInterval(this.awarenessTimer);
    this.awarenessTimer = null;
  }

  private listenOnline(): void {
    const g = globalThis as { addEventListener?: (t: string, f: () => void) => void };
    if (this.onlineListener || typeof g.addEventListener !== "function") return;
    this.onlineListener = () => {
      if (this.manualStop || this.stoppedReason || this.ws) return;
      this.clearReconnect();
      this.open();
    };
    g.addEventListener("online", this.onlineListener);
  }

  private unlistenOnline(): void {
    const g = globalThis as { removeEventListener?: (t: string, f: () => void) => void };
    if (this.onlineListener) g.removeEventListener?.("online", this.onlineListener);
    this.onlineListener = null;
  }

  // ─── awareness timer ─────────────────────────────────────────────────────

  private startAwarenessTimer(): void {
    if (this.awarenessTimer) return;
    const timeout = this.opts.awarenessTimeoutMs;
    this.awarenessTimer = setInterval(() => {
      const now = Date.now();
      for (const sub of this.subs.values()) {
        if (sub.remote.sweep(now)) sub.onAwareness?.(sub.remote.states());
        // keep-alive so peers do not time us out
        if (sub.state === "active" && sub.localAwareness !== null && now - sub.lastAwarenessSent >= timeout / 2) {
          this.sendAwareness(sub, sub.localAwareness);
        }
      }
    }, Math.max(50, Math.floor(timeout / 4)));
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private sendSubscribe(sub: Sub): void {
    sub.state = "pending";
    this.send({
      channelId: 0,
      type: "subscribe",
      payload: {
        channelId: sub.channelId,
        documentId: sub.documentId,
        epoch: sub.epoch,
        stateVector: bytesToBase64(Y.encodeStateVector(sub.doc)),
        mode: sub.mode,
      },
    });
  }

  private onLocalUpdate(sub: Sub, update: Uint8Array, origin: unknown): void {
    if (origin === this.remoteOrigin) return; // never echo what the server told us
    if (sub.state !== "active" || sub.mode === "view") return; // covered by the next two-step
    const clientSeq = ++sub.clientSeq;
    sub.unacked.add(clientSeq);
    this.send({
      channelId: sub.channelId,
      type: "update",
      payload: { epoch: sub.epoch, clientSeq, update: update as Bytes },
    });
  }

  private applyRemote(sub: Sub, update: Uint8Array): void {
    try {
      Y.applyUpdateV2(sub.doc, update, this.remoteOrigin);
    } catch (e) {
      this.emit("error", { message: `apply failed for ${sub.documentId}: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  private markStale(sub: Sub, ev: EpochChangedEvent): void {
    if (sub.state === "stale") return;
    sub.state = "stale";
    sub.unacked.clear();
    this.emit("epochChanged", ev);
  }

  private sendAwareness(sub: Sub, state: unknown): void {
    sub.lastAwarenessSent = Date.now();
    this.send({
      channelId: sub.channelId,
      type: "awareness",
      payload: encodeAwareness({ clientId: sub.doc.clientID, state }) as Bytes,
    });
  }

  private send(frame: SyncFrame): void {
    const ws = this.ws;
    if (ws && ws.readyState === 1) this.rawSend(ws, frame);
  }

  private rawSend(ws: WebSocket, frame: SyncFrame): void {
    try {
      // TS 6 made Uint8Array generic over its buffer; a Uint8Array is a valid
      // BufferSource at runtime, so narrow it for WebSocket.send's overload.
      ws.send(encodeFrame(frame) as BufferSource);
      this.lastSent = Date.now();
    } catch (e) {
      this.emit("error", { message: `send failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  private closeSocket(ws: WebSocket, code: number, reason: string): void {
    try {
      ws.close(code, reason);
    } catch {
      /* already closed */
    }
  }

  private clearAuthTimer(): void {
    if (this.authTimer) clearTimeout(this.authTimer);
    this.authTimer = null;
  }

  private setStatus(s: ConnectionStatus): void {
    if (this._status === s) return;
    this._status = s;
    this.emit("status", s);
  }

  private setDocStatus(sub: Sub, status: DocSyncStatus): void {
    if (sub.status === status) return;
    sub.status = status;
    this.emit("docStatus", { documentId: sub.documentId, status });
  }

  private rejectWaiters(e: Error): void {
    for (const w of this.waiters.splice(0)) w.reject(e);
  }

  private emit<E extends keyof SyncClientEvents>(event: E, payload: SyncClientEvents[E]): void {
    for (const fn of this.listeners.get(event) ?? []) {
      try {
        (fn as (p: SyncClientEvents[E]) => void)(payload);
      } catch {
        /* a listener must not break the client */
      }
    }
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
