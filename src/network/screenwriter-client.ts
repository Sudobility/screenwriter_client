import {
  API_BASE_PATH,
  ACCOUNT_DELETE_CONFIRM,
  ASSET_PART_SIZE_BYTES,
  ASSET_UPLOAD_CONCURRENCY,
  type AssetAbortResponse,
  type AssetCompleteRequest,
  type AssetDeleteResponse,
  type AssetDetail,
  type AssetKind,
  type AssetLink,
  type AssetLinkCreateRequest,
  type AssetLinkDeleteResponse,
  type AssetLinkUpdateRequest,
  type AssetLinkWithStaleness,
  type AssetListItem,
  type AssetListQuery,
  type AssetPartUrl,
  type AssetPartsRequest,
  type AssetPartsResponse,
  type AssetProvenanceInput,
  type AssetRights,
  type AssetSummary,
  type AssetUpdateRequest,
  type AssetUploadInit,
  type AssetUploadRequest,
  type AssetUploadStatus,
  type AssetUrlQuery,
  type AssetUrlResponse,
  type DocumentAssetLinksQuery,
  type DocumentStalenessQuery,
  type TargetStaleness,
  type LinkStaleness,
  type AccountDeleteResponse,
  type AccountRestoreResponse,
  type DeleteResponse,
  type DictionaryResponse,
  type DictionaryUpdateRequest,
  type DictionaryUpdateResponse,
  type DocumentViewState,
  type DocumentViewStatePutResponse,
  type DocumentViewStateResponse,
  type StarResponse,
  type UserMacro,
  type UserMacroCreateRequest,
  type UserMacroPatchRequest,
  type UserPreferences,
  type UserPreferencesInput,
  type UserPreferencesPutResponse,
  type UserPreferencesResponse,
  type WritingGoal,
  type WritingGoalsPutRequest,
  type WritingSessionRequest,
  type WritingSessionResponse,
  type WritingStats,
  type WritingStatsQuery,
  type ApplyTemplateResponse,
  type DocumentApplyTemplateRequest,
  type DocumentDuplicateRequest,
  type DocumentMoveRequest,
  type ProjectBinCreateRequest,
  type ProjectBinDeleteResponse,
  type ProjectBinItem,
  type ProjectDuplicateRequest,
  type ProjectFolder,
  type ProjectFolderCreateRequest,
  type ProjectFolderDeleteResponse,
  type ProjectFolderUpdateRequest,
  type PurgeScheduledResponse,
  type TemplateArchiveResponse,
  type TemplateCreateRequest,
  type TemplateExportResponse,
  type TemplateFileFormat,
  type TemplateImportRequest,
  type TemplateImportByIdRequest,
  type ExportCombinedRequest,
  type ExportCreateRequest,
  type ImportCreateRequest,
  type ImportCreateResponse,
  type ImportOptions,
  type ImportOverRequest,
  type JobOutput,
  type UploadStateRequest,
  type UploadStateResponse,
  type WatermarkLookupRequest,
  type WatermarkLookupResponse,
  type TemplateListQuery,
  type TemplateUpdateRequest,
  type TemplateVersionCreateRequest,
  type TrashItem,
  type WorkspaceContact,
  type WorkspaceContactDeleteResponse,
  type WorkspaceContactPatchRequest,
  type WorkspaceContactsCreateRequest,
  type WorkspaceContactsQuery,
  type WorkspaceDefaults,
  type WorkspaceDefaultsDoc,
  type WorkspaceDefaultsPutRequest,
  type WorkspaceDocumentsQuery,
  type AiJob,
  type Job,
  type JobCreateRequest,
  type JobDryRunResponse,
  type JobListQuery,
  type JobOutputsResponse,
  type JobRecipient,
  type AiJobCreated,
  type AiActionResponse,
  type GenerateCharacterSkeletonRequest,
  type GenerateCharacterSkeletonResult,
  type SmartPasteCharactersRequest,
  type SmartPasteCharactersResult,
  type SmartPastePlotsRequest,
  type SmartPastePlotsResult,
  type SmartPasteScriptRequest,
  type SmartPasteScriptResult,
  type SceneSummariesResponse,
  type SuggestNoteFixRequest,
  type SuggestNoteFixResult,
  type GenerateScriptRequest,
  type GenerateScriptResult,
  type PolishCharacterDialogueRequest,
  type PolishCharacterDialogueResult,
  type PolishSceneRequest,
  type PolishSceneResult,
  type AiJobCreateRequest,
  type AiStatus,
  type ApiKeyCreated,
  type ApiKeyCreateRequest,
  type ApiKeyRevokeResponse,
  type ApiKeySummary,
  type ApiKeyUpdateRequest,
  type SuggestionAcceptResponse,
  type SuggestionSet,
  type SuggestionSetSummary,
  type AiConsentAcceptRequest,
  type AiConsentAcceptResponse,
  type AiConsentStatus,
  type AiEstimateRequest,
  type AiEstimateResponse,
  type AiActivityItem,
  type AiReportSummary,
  type AiNoteConvertResponse,
  type SuggestionDecideRequest,
  type SuggestionDecideResponse,
  type CoverageReport,
  type ConsumableBalanceResponse,
  type ConsumablePurchaseRecord,
  type ConsumableUsageRecord,
  type CreditProduct,
  type CreditCoupon,
  type CreditCouponCreateRequest,
  type CreditCouponRedeemResponse,
  type PurchaseHandoffRequest,
  type PurchaseHandoffResponse,
  type PublicConfig,
  type NamesDbResponse,
  type DeepHealthResponse,
  type WatermarkedDownloadInfo,
  type PurchaseHandoffRedeemRequest,
  type PurchaseHandoffRedeemResponse,
  type TelemetryRequest,
  type TelemetryResponse,
  type AdminUserLookup,
  type AdminUserRestoreResponse,
  type AdminUserPurgeResponse,
  type AdminJobListQuery,
  type AdminJobRefundRequest,
  type AdminJobRefundResponse,
  type AdminJobKind,
  type AdminJobKindPatchRequest,
  type AdminDocumentMeta,
  type AlternatesView,
  type ApiRouteName,
  type BeatRow,
  type BinRow,
  type ChangeRow,
  type CharacterPacket,
  type DialogueSceneView,
  type DocumentSearchHit,
  type DocumentSearchQuery,
  type EntityDetail,
  type EntityListQuery,
  type EntitySummary,
  type EntityUsage,
  type LocationPacket,
  type NoteSummary,
  type PacketQuery,
  type ReportCreateRequest,
  type ReportKind,
  type ReportKindInfo,
  type ReportResult,
  type ResolveResult,
  type RevisionsView,
  type ScenePacket,
  type SearchHit,
  type SearchQuery,
  type ShotPacket,
  type ShotRow,
  type StatsRead,
  type TagCategoryRow,
  type TagRow,
  type TitlePageRead,
  type DocumentLockResponse,
  type GrantUpdateRequest,
  type Invitation,
  type InvitationAcceptResult,
  type InvitationCreateRequest,
  type Member,
  type PublicShareInfo,
  type Role,
  type ShareGrant,
  type ShareLink,
  type ShareLinkCreateRequest,
  type ShareLinkCreated,
  type ShareLinkRevokeResponse,
  type ShareLinkUpdateRequest,
  type ShareTarget,
  type ShareUnlockResponse,
  type SharedItem,
  type UnlockSession,
  type ManagedEntity,
  type EntityAuditQuery,
  type EntityCreateRequest,
  type EntityDeleteResponse,
  type EntityUpdateRequest,
  type EntityUsageOverview,
  type CommandBatchRequest,
  type CommandBatchResponse,
  type CursorQuery,
  type DocumentCreateRequest,
  type DocumentDetail,
  type DocumentListQuery,
  type DocumentMeta,
  type DocumentImportRequest,
  type DocumentImportResult,
  type DocumentUpdateRequest,
  type ElementsBatchResponse,
  type ExportFormatId,
  type ConversionReport,
  type FormatInfo,
  type Me,
  type MeUpdateRequest,
  type OutlineResponse,
  type Paginated,
  type Project,
  type ProjectCreateRequest,
  type ProjectListQuery,
  type ProjectSummary,
  type ProjectUpdateRequest,
  type SceneRead,
  type ScenesBatchResponse,
  type SnapshotCreateRequest,
  type SnapshotCommentCreateRequest,
  type SnapshotCommentResolveRequest,
  type SnapshotComment,
  type SnapshotNote,
  type SnapshotNoteCreateRequest,
  type SnapshotPrefsRequest,
  type SnapshotPrefsResponse,
  type CopyToLiveResponse,
  type CompareRequest,
  type DocumentDiff,
  type ElementHistoryEntry,
  type PresenceEntry,
  type VersionRestoreAsCopyRequest,
  type SnapshotCreateResponse,
  type SnapshotDetail,
  type SnapshotForkRequest,
  type SnapshotListResponse,
  type SnapshotOpenResponse,
  type SnapshotSummary,
  type TemplateSummary,
  type TrashResult,
  type VersionListItem,
  type VersionRestoreResponse,
  type VersionSnapshotRequest,
  type ManagedEntityDetail,
  type ManagedEntityListItem,
  // B12 collaboration, notifications, devices, email
  type ActivityEvent,
  type ActivityQuery,
  type ChatMessage,
  type ChatMessageCreateRequest,
  type ChatMessageDeleteResponse,
  type ChatMessageUpdateRequest,
  type ChatQuery,
  type Device,
  type DeviceCreateRequest,
  type DeviceCreateResponse,
  type DeviceRevokeResponse,
  type DeviceUpdateRequest,
  type MentionWithoutAccess,
  type Notification,
  type NotificationDeleteResponse,
  type NotificationPrefs,
  type NotificationPrefsUpdate,
  type NotificationsQuery,
  type NotificationsReadRequest,
  type NotificationsReadResponse,
  type PushTokenDeleteResponse,
  type PushTokenSetRequest,
  type PushTokenSetResponse,
  type WorkspaceActivityEvent,
  type WorkspaceActivityQuery,
} from "@sudobility/screenwriter_types";
import type { CharacterImageResult, CharacterLooksRequest, CharacterSheetRequest } from "@sudobility/screenwriter_types";
import type { LocationImageTime, LocationLooksRequest, LocationLooksResult, LocationTimesRequest, LocationTimesResult } from "@sudobility/screenwriter_types";
import type { PropImageResult, PropLooksRequest, PropSheetRequest } from "@sudobility/screenwriter_types";
import type { ProductionImageKind, ProductionImageRequest, ProductionImageResult, GeneratedImageCount } from "@sudobility/screenwriter_types";
import type { DocumentJSON, TemplateJSON } from "@sudobility/writing_core";
import {
  ApiError,
  AssetUploadInterruptedError,
  StaleWriteError,
  apiErrorFrom,
} from "../errors";
import {
  base64ToBytes,
  bytesToBase64,
  type BinaryInput,
  toUint8Array,
} from "../util/base64";
import { sha256Hex } from "../util/sha256";
import { backoffDelay } from "../sync/backoff";
import type {
  HttpMethod,
  NetworkClient,
  NetworkResponse,
} from "./network-client";
import {
  GZIP_MIN_BYTES,
  canGzip,
  gzipText,
  isRetryable,
  newIdempotencyKey,
  parseRetryAfter,
  resolveRetry,
  retryDelayMs,
  type RetryPolicy,
} from "./retry";

export interface ScreenwriterClientOptions {
  network: NetworkClient;
  /** API origin, e.g. `http://localhost:8036` (no `/api/v1`). */
  baseUrl: string;
  /**
   * Bearer token supplier. Called per request; `forceRefresh` is true on the one retry after a 401.
   * Return null when signed out.
   */
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  /** Selected entity used by entity-scoped credit actions. */
  getSelectedEntityId?: () => string | null;
  /** Sent as `X-Client` on every request, e.g. `web/1.4.0` (`fadewright-mcp/<v>` marks MCP command origins). */
  clientTag?: string;
  /**
   * Retry policy (spec 10 §2.4): GET/PUT/DELETE always, POST only with an `Idempotency-Key` (every POST the client sends
   * carries one, except the read-only and file-body ones), network errors, 408, 429 `RATE_LIMITED`, 502, 503, 504,
   * full-jitter backoff, `Retry-After` honoured. `false` disables retries; a partial object overrides defaults.
   */
  retry?: Partial<RetryPolicy> | false;
  /** Gzip JSON bodies of at least 1 KiB when the platform has `CompressionStream` (default true). */
  gzip?: boolean;
  /** Where `Idempotency-Key` values come from (default: a random UUID per call). Tests inject a counter. */
  newIdempotencyKey?: () => string;
}

/** A Yjs V2 document state as fetched over REST. */
export interface BinaryState {
  state: Uint8Array;
  epoch: number;
  /** Only `/documents/:did/state` sends it. */
  stateVector: Uint8Array | null;
}

/** `importDocument` input: the file as `bytes` (or an already-encoded `contentB64`) plus the request options. */
export type ImportDocumentInput = Omit<DocumentImportRequest, "contentB64"> &
  (
    | { bytes: BinaryInput; contentB64?: undefined }
    | { contentB64: string; bytes?: undefined }
  );

export interface ExportedDocument {
  filename: string;
  mimeType: string;
  /** Decoded file bytes. */
  bytes: Uint8Array;
  report: ConversionReport;
  format: ExportFormatId;
}

/** Where `importFile` puts a file: a new document in a project, or over an existing document (`pre-import` snapshot, epoch bump). */
export type ImportFileTarget =
  | { projectId: string; documentId?: undefined }
  | { documentId: string; projectId?: undefined };
/** A file for `importFile`. `format` is auto-detected from the bytes when omitted. */
export interface ImportFileInput {
  filename: string;
  bytes: BinaryInput;
  format?: string;
  options?: ImportOptions;
}

/** `importTemplate` input: the file as `bytes` (or an already-encoded `contentB64`) plus scope and file name. */
export type ImportTemplateInput = Omit<TemplateImportRequest, "contentB64"> &
  (
    | { bytes: BinaryInput; contentB64?: undefined }
    | { contentB64: string; bytes?: undefined }
  );
/** What `importTemplate` takes: the file (inline), or `{importId}` of an upload made with `createImportJob({templateTarget, ...})`. */
export type ImportTemplateArg = ImportTemplateInput | TemplateImportByIdRequest;

export interface ExportedTemplate {
  filename: string;
  mimeType: string;
  /** Decoded file bytes. */
  bytes: Uint8Array;
  format: TemplateFileFormat;
}

/** What `setWorkspaceDefaults` takes: top-level keys to set; `null` resets one to empty. */
export type WorkspaceDefaultsUpdate = {
  [K in keyof WorkspaceDefaultsDoc]?: WorkspaceDefaultsDoc[K] | null;
};

/** A `applyTemplate` answer is the `doc.applyTemplate` job (not the dry-run report) when it has a `status`. */
export const isApplyTemplateJob = (r: ApplyTemplateResponse): r is Job =>
  "status" in r && "kind" in r;

// ─── assets (B11) ────────────────────────────────────────────────────────────

/** A file for `uploadAsset`: a web `File`/`Blob`, or `{uri, name, type}` (React Native and similar: read through platform `fetch`). */
export type UploadableFile =
  File | Blob | { uri: string; name: string; type: string };

export interface UploadAssetOptions {
  kind: AssetKind;
  /** Client-minted `asset_...` id (offline staging), accepted if unused. */
  assetId?: string;
  title?: string;
  /** A new version of this existing version (its asset, not `assetId`, decides which asset it lands on). */
  parentVersionId?: string;
  provenance?: AssetProvenanceInput;
  rights?: Partial<AssetRights>;
  /** 0..1 of bytes sent, called after each part and once more at 1 when the asset is ready. */
  onProgress?: (fraction: number) => void;
  /** Part PUTs in flight at once (default `ASSET_UPLOAD_CONCURRENCY`, 3). */
  concurrency?: number;
  /** Retries per part before giving up on the whole upload (default 3). */
  partRetries?: number;
  signal?: AbortSignal;
  /** Resume an upload from an earlier `AssetUploadInterruptedError.uploadId`: only the parts the storage does not have yet are sent. */
  resumeUploadId?: string;
}

/** At most this many bytes are hashed up front (enables dedup before any bytes are sent); a bigger file skips it and relies on the server's own streaming re-hash at `complete`. */
export const PREHASH_MAX_BYTES = 64 * 1024 * 1024;

function isBlobLike(v: unknown): v is Blob {
  return typeof Blob !== "undefined" && v instanceof Blob;
}

async function resolveUploadable(
  file: UploadableFile,
): Promise<{ blob: Blob; name: string; type: string; size: number }> {
  if (isBlobLike(file)) {
    const name =
      typeof File !== "undefined" && file instanceof File
        ? file.name
        : "upload";
    return {
      blob: file,
      name,
      type: file.type || "application/octet-stream",
      size: file.size,
    };
  }
  const res = await fetch(file.uri);
  if (!res.ok)
    throw new ApiError(
      `Could not read ${file.uri}: HTTP ${res.status}`,
      "NETWORK_ERROR",
      0,
    );
  const blob = await res.blob();
  return {
    blob,
    name: file.name,
    type: file.type || blob.type || "application/octet-stream",
    size: blob.size,
  };
}

async function sha256HexOfBlob(blob: Blob): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

type Query = Record<string, string | number | boolean | undefined>;

/**
 * Which credential a request carries. `user` (default): the signed-in user's token if there is one (retried once on 401).
 * `none`: no Authorization header at all (public share routes, works signed out). `{bearer}`: exactly that token, such as a
 * link session (`fls_...`).
 */
export type AuthMode = "user" | "none" | { bearer: string };

/** A place sharing attaches to: `inviteMember`, `listGrants`, `createShareLink` and `listShareLinks` dispatch on `type`. */
export type ShareLinkTargetRef = {
  type: "document" | "project" | "snapshot";
  id: string;
};

const enc = encodeURIComponent;

const packetQuery = (q: PacketQuery): Query => ({
  snapshotId: q.snapshotId,
  include: q.include?.join(","),
});

/** A `getReport` / `createReport` answer is a `report.render` job (not the result) when it has a `status`. */
export const isReportJob = (r: ReportResult | Job): r is Job =>
  "status" in r && "kind" in r && r.kind === "report.render";

/** What `setPreferences` takes: top-level keys to set; `null` removes a key. `version` is kept from the server copy unless given. */
export type UserPreferencesUpdate = {
  [K in keyof UserPreferencesInput]?: UserPreferencesInput[K] | null;
};
/** What `setMyDocumentState` takes: top-level keys to set; `null` removes a key. */
export type DocumentViewStateUpdate = {
  [K in keyof DocumentViewState]?: DocumentViewState[K] | null;
};
/** One goal of `setWritingGoals` (`id` keeps an existing goal; without it a new one is created). */
export type WritingGoalInput = WritingGoalsPutRequest["goals"][number];

/** `{...current, ...update}` per top-level key: an `undefined` value is ignored, `null` deletes the key. `updatedAt` is dropped. */
export function mergeTopLevel<T extends object>(
  current: T & { updatedAt?: string },
  update: { [K in keyof T]?: T[K] | null },
): T {
  const { updatedAt: _dropped, ...rest } = current as Record<string, unknown>;
  const out: Record<string, unknown> = { ...rest };
  for (const [k, v] of Object.entries(update)) {
    if (v === undefined) continue;
    if (v === null) delete out[k];
    else out[k] = v;
  }
  return out as T;
}

/** A fresh `clientSessionId` for `recordWritingSession` (`wss_` + 32 hex chars). */
export function newWritingSessionId(): string {
  return `wss_${newIdempotencyKey()
    .replace(/[^A-Za-z0-9]/g, "")
    .padEnd(32, "0")
    .slice(0, 32)}`;
}

/**
 * Typed wrapper over every route the API serves. Returns unwrapped envelope `data`, throws `ApiError`.
 * Which method serves which `API_ROUTES` entry is declared in `API_ROUTE_METHODS` (checked by a test).
 */
export class ScreenwriterClient {
  countGeneratedImages(projectId: string): Promise<GeneratedImageCount> {
    return this.json("GET", `/projects/${enc(projectId)}/generated-images`);
  }

  generateProductionImage(did: string, kind: ProductionImageKind, subjectId: string, request: ProductionImageRequest): Promise<ProductionImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/production-images/${kind}/${enc(subjectId)}`, undefined, request);
  }

  async getProductionImage(did: string, kind: ProductionImageKind, subjectId: string, imageId: string): Promise<Uint8Array> {
    const res = await this.send("GET", `/documents/${enc(did)}/ai/production-images/${kind}/${enc(subjectId)}/${enc(imageId)}`);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return res.body;
  }

  deleteProductionImage(did: string, kind: ProductionImageKind, subjectId: string, imageId: string): Promise<{ deleted: boolean }> {
    return this.json("DELETE", `/documents/${enc(did)}/ai/production-images/${kind}/${enc(subjectId)}/${enc(imageId)}`);
  }

  /** Upload a user-supplied PNG (base64 data URL) instead of generating one; returns the id the visual state references. */
  uploadProductionImage(did: string, kind: ProductionImageKind, subjectId: string, image: string): Promise<ProductionImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/production-images/${kind}/${enc(subjectId)}/upload`, undefined, { image });
  }

  generatePropLooks(did: string, propId: string, request: PropLooksRequest): Promise<PropImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/props/${enc(propId)}/looks`, undefined, request);
  }

  generatePropSheet(did: string, propId: string, request: PropSheetRequest): Promise<PropImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/props/${enc(propId)}/sheet`, undefined, request);
  }

  uploadPropImage(did: string, propId: string, kind: "looks" | "sheet", image: string): Promise<PropImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/props/${enc(propId)}/upload/${kind}`, undefined, { image });
  }

  async getPropImage(did: string, propId: string, kind: "looks" | "sheet", imageId: string): Promise<Uint8Array> {
    const res = await this.send("GET", `/documents/${enc(did)}/ai/props/${enc(propId)}/images/${kind}/${enc(imageId)}`);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return res.body;
  }

  generateLocationLooks(did: string, locationId: string, request: LocationLooksRequest): Promise<LocationLooksResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/locations/${enc(locationId)}/looks`, undefined, request);
  }

  generateLocationTimes(did: string, locationId: string, request: LocationTimesRequest): Promise<LocationTimesResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/locations/${enc(locationId)}/times`, undefined, request);
  }

  uploadLocationImage(did: string, locationId: string, kind: "looks" | LocationImageTime, image: string): Promise<{ id: string; kind: "looks" | LocationImageTime; mimeType: "image/png" }> {
    return this.json("POST", `/documents/${enc(did)}/ai/locations/${enc(locationId)}/upload/${kind}`, undefined, { image });
  }

  async getLocationImage(did: string, locationId: string, kind: "looks" | LocationImageTime, imageId: string): Promise<Uint8Array> {
    const res = await this.send("GET", `/documents/${enc(did)}/ai/locations/${enc(locationId)}/images/${kind}/${enc(imageId)}`);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return res.body;
  }

  generateCharacterLooks(did: string, characterId: string, request: CharacterLooksRequest): Promise<CharacterImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/characters/${enc(characterId)}/looks`, undefined, request);
  }

  generateCharacterSheet(did: string, characterId: string, request: CharacterSheetRequest): Promise<CharacterImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/characters/${enc(characterId)}/sheet`, undefined, request);
  }

  uploadCharacterImage(did: string, characterId: string, kind: "looks" | "sheet", image: string): Promise<CharacterImageResult> {
    return this.json("POST", `/documents/${enc(did)}/ai/characters/${enc(characterId)}/upload/${kind}`, undefined, { image });
  }

  async getCharacterImage(did: string, characterId: string, kind: "looks" | "sheet", imageId: string): Promise<Uint8Array> {
    const res = await this.send("GET", `/documents/${enc(did)}/ai/characters/${enc(characterId)}/images/${kind}/${enc(imageId)}`);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return res.body;
  }
  /** Unlock-session tokens by document id, sent as `X-Doc-Unlock` on that document's routes (spec 05 §6.7). */
  private readonly unlockTokens = new Map<string, string>();

  constructor(private readonly opts: ScreenwriterClientOptions) {}

  /** Remember (or forget, with null) an unlock-session token for a locked document. `createUnlockSession` does this itself. */
  setDocumentUnlock(did: string, token: string | null): void {
    if (token) this.unlockTokens.set(did, token);
    else this.unlockTokens.delete(did);
  }
  getDocumentUnlock(did: string): string | null {
    return this.unlockTokens.get(did) ?? null;
  }

  // ─── transport ───────────────────────────────────────────────────────────

  private url(path: string, query?: Query): string {
    const base = this.opts.baseUrl.replace(/\/+$/, "");
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {}))
      if (v !== undefined) qs.set(k, String(v));
    const q = qs.toString();
    return `${base}${API_BASE_PATH}${path}${q ? `?${q}` : ""}`;
  }

  /** WebSocket URL of the sync endpoint on this API. */
  syncUrl(): string {
    return this.url("/sync").replace(/^http/, "ws");
  }

  /** POSTs that never get an `Idempotency-Key`: reads dressed as POST and file bodies the server already dedupes by id. */
  private static readonly NO_KEY = [
    /\/export$/,
    /\/documents\/import$/,
    /\/(elements|scenes)\/batch$/,
    /\/share\/[^/]+\/unlock$/,
    /\/documents\/[^/]+\/compare$/,
  ];

  /**
   * The request funnel (spec 10 §2.2): headers (token, `X-Client`, unlock token, `Idempotency-Key` on creates), gzip of
   * JSON bodies >= 1 KiB, one token refresh after a 401, then the retry policy (§2.4). The idempotency key is made once
   * and reused by every retry of the same logical call.
   */
  private async send(
    method: HttpMethod,
    path: string,
    query?: Query,
    body?: unknown,
    auth: AuthMode = "user",
    key?: string,
  ): Promise<NetworkResponse> {
    const policy = resolveRetry(this.opts.retry);
    const idemKey =
      key ??
      (method === "POST" &&
      !ScreenwriterClient.NO_KEY.some((re) => re.test(path))
        ? (this.opts.newIdempotencyKey ?? newIdempotencyKey)()
        : undefined);
    const did = /^\/documents\/([^/]+)/.exec(path)?.[1];
    const unlock = did
      ? this.unlockTokens.get(decodeURIComponent(did))
      : undefined;
    let payload: string | Uint8Array | undefined;
    let gzipped = false;
    if (body !== undefined) {
      const text = JSON.stringify(body);
      if (
        this.opts.gzip !== false &&
        text.length >= GZIP_MIN_BYTES &&
        canGzip()
      ) {
        payload = await gzipText(text);
        gzipped = true;
      } else {
        payload = text;
      }
    }
    const once = async (forceRefresh: boolean): Promise<NetworkResponse> => {
      const headers: Record<string, string> = {};
      const token =
        auth === "user"
          ? await this.opts.getToken(forceRefresh)
          : auth === "none"
            ? null
            : auth.bearer;
      if (token) headers.Authorization = `Bearer ${token}`;
      if (this.opts.clientTag) headers["X-Client"] = this.opts.clientTag;
      const entityId = this.opts.getSelectedEntityId?.();
      if (entityId) headers["X-Entity-Id"] = entityId;
      if (unlock) headers["X-Doc-Unlock"] = unlock;
      if (idemKey) headers["Idempotency-Key"] = idemKey;
      if (payload !== undefined) {
        headers["Content-Type"] = "application/json";
        if (gzipped) headers["Content-Encoding"] = "gzip";
      }
      try {
        const req: Parameters<NetworkClient["request"]>[0] = {
          method,
          url: this.url(path, query),
          headers,
        };
        if (payload !== undefined) req.body = payload;
        return await this.opts.network.request(req);
      } catch (e) {
        throw new ApiError(
          e instanceof Error ? e.message : String(e),
          "NETWORK_ERROR",
          0,
        );
      }
    };
    let attempt = 1;
    let refreshed = false;
    for (;;) {
      let res: NetworkResponse | null = null;
      let failure: ApiError | null = null;
      try {
        res = await once(refreshed && attempt === 1 ? true : false);
      } catch (e) {
        failure = e as ApiError;
      }
      if (res && res.status === 401 && auth === "user" && !refreshed) {
        refreshed = true; // one refresh, not a retry attempt
        res = await once(true).catch((e) => ((failure = e as ApiError), null));
      }
      const status = res?.status ?? 0;
      const code = res && status >= 400 ? this.codeOf(res) : undefined;
      if (
        attempt >= policy.maxAttempts ||
        !isRetryable(method, !!idemKey, status, code)
      ) {
        if (failure && !res) throw failure;
        return res as NetworkResponse;
      }
      await policy.sleep(
        retryDelayMs(
          policy,
          attempt,
          status,
          parseRetryAfter(res?.headers["retry-after"]),
        ),
      );
      attempt++;
    }
  }

  /** The `code` of a failure envelope, if the body is one. */
  private codeOf(res: NetworkResponse): string | undefined {
    try {
      const env = JSON.parse(new TextDecoder().decode(res.body)) as {
        success?: boolean;
        code?: string;
      };
      return env.success === false ? env.code : undefined;
    } catch {
      return undefined;
    }
  }

  private fail(res: NetworkResponse): never {
    let env: unknown;
    try {
      env = JSON.parse(new TextDecoder().decode(res.body));
    } catch {
      /* not JSON */
    }
    if (
      env &&
      typeof env === "object" &&
      (env as { success?: unknown }).success === false
    ) {
      const f = env as {
        error?: string;
        code?: string;
        details?: Record<string, unknown>;
      };
      const retryAfter = parseRetryAfter(res.headers["retry-after"]);
      const details =
        retryAfter !== undefined && f.details?.retryAfterS === undefined
          ? { ...f.details, retryAfterS: Math.ceil(retryAfter / 1000) }
          : f.details;
      throw apiErrorFrom(
        f.error ?? `HTTP ${res.status}`,
        (f.code ?? "INTERNAL") as ApiError["code"],
        res.status,
        details,
      );
    }
    throw new ApiError(`HTTP ${res.status}`, "BAD_RESPONSE", res.status);
  }

  private async json<T>(
    method: HttpMethod,
    path: string,
    query?: Query,
    body?: unknown,
    auth: AuthMode = "user",
    key?: string,
  ): Promise<T> {
    const res = await this.send(method, path, query, body, auth, key);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    try {
      const env = JSON.parse(new TextDecoder().decode(res.body)) as {
        success?: boolean;
        data?: T;
      };
      if (env.success !== true) throw new Error("not a success envelope");
      return env.data as T;
    } catch {
      throw new ApiError(
        "Malformed response envelope",
        "BAD_RESPONSE",
        res.status,
      );
    }
  }

  private async bytes(
    path: string,
    query?: Query,
    auth: AuthMode = "user",
  ): Promise<BinaryState> {
    const res = await this.send("GET", path, query, undefined, auth);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    const sv = res.headers["x-state-vector"];
    return {
      state: res.body,
      epoch: Number(res.headers["x-epoch"] ?? 0),
      stateVector: sv
        ? Uint8Array.from(atob(sv), (c) => c.charCodeAt(0))
        : null,
    };
  }

  // ─── health, me ──────────────────────────────────────────────────────────

  health() {
    return this.json<{ status: string } & Record<string, unknown>>(
      "GET",
      "/health",
    );
  }
  me() {
    return this.json<Me>("GET", "/me");
  }
  updateMe(patch: MeUpdateRequest) {
    return this.json<Me>("PATCH", "/me", undefined, patch);
  }

  // ─── entities ──────────────────────────────────────────────────────────

  listManagedEntities() {
    return this.json<Paginated<ManagedEntityListItem>>("GET", "/entities");
  }
  getEntityDetails(entityId: string) {
    return this.json<ManagedEntityDetail>("GET", `/entities/${enc(entityId)}`);
  }
  /** A team workspace with the caller as its owner (409 `LIMIT_EXCEEDED` past 50 owned teams). */
  createManagedEntity(body: EntityCreateRequest) {
    return this.json<ManagedEntity>("POST", "/entities", undefined, body);
  }
  updateManagedEntity(entityId: string, patch: EntityUpdateRequest) {
    return this.json<ManagedEntity>(
      "PATCH",
      `/entities/${enc(entityId)}`,
      undefined,
      patch,
    );
  }
  /** Soft delete; `confirmName` must equal the workspace name (400 `CONFIRMATION_MISMATCH`). */
  deleteManagedEntity(entityId: string, confirmName: string) {
    return this.json<EntityDeleteResponse>(
      "DELETE",
      `/entities/${enc(entityId)}`,
      undefined,
      { confirmName },
    );
  }
  /** Make another member the owner; the caller becomes an admin. */
  transferManagedEntity(entityId: string, toUserId: string) {
    return this.json<ManagedEntity>(
      "POST",
      `/entities/${enc(entityId)}/transfer`,
      undefined,
      { toUserId },
    );
  }
  /** 409 `LAST_OWNER` for the sole owner. */
  leaveManagedEntity(entityId: string) {
    return this.json<{ left: true }>("POST", `/entities/${enc(entityId)}/leave`);
  }
  getManagedEntityUsage(entityId: string) {
    return this.json<EntityUsageOverview>("GET", `/entities/${enc(entityId)}/usage`);
  }
  /** Documents across the workspace's projects; `starred` is the caller's own stars, `label` a document label. */
  listWorkspaceDocuments(
    wid: string,
    query: Partial<WorkspaceDocumentsQuery> = {},
  ) {
    return this.json<Paginated<DocumentMeta>>(
      "GET",
      `/entities/${enc(wid)}/documents`,
      query,
    );
  }
  /** Trashed projects and documents, with the date each is purged (30 days after it was trashed). */
  listTrash(wid: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<TrashItem>>(
      "GET",
      `/entities/${enc(wid)}/trash`,
      query,
    );
  }
  /** Purge everything in the trash now (admin): a `system.purge` `Job`. 400 `CONFIRMATION_MISMATCH` unless `confirm` is `EMPTY`. */
  emptyTrash(wid: string) {
    return this.json<Job>(
      "POST",
      `/entities/${enc(wid)}/trash/empty`,
      undefined,
      { confirm: "EMPTY" },
    );
  }
  getWorkspaceDefaults(wid: string) {
    return this.json<WorkspaceDefaults>(
      "GET",
      `/entities/${enc(wid)}/defaults`,
    );
  }
  /**
   * Set some of the workspace defaults (admin). Merges `update` per top-level key onto the server copy (or `base`, the last
   * result, to skip the read; `null` resets a key), PUTs the whole document with `baseUpdatedAt`, and on 409 `STALE_WRITE`
   * merges onto `details.current` and retries ONCE. Resolves to the resulting defaults.
   */
  async setWorkspaceDefaults(
    wid: string,
    update: WorkspaceDefaultsUpdate,
    base?: WorkspaceDefaults,
  ): Promise<WorkspaceDefaults> {
    let current = base ?? (await this.getWorkspaceDefaults(wid));
    for (let attempt = 0; ; attempt++) {
      const next = mergeTopLevel<WorkspaceDefaultsDoc>(
        current,
        update as never,
      );
      try {
        return await this.json<WorkspaceDefaults>(
          "PUT",
          `/entities/${enc(wid)}/defaults`,
          undefined,
          {
            ...next,
            baseUpdatedAt: current.updatedAt,
          } satisfies WorkspaceDefaultsPutRequest,
        );
      } catch (e) {
        const server = e instanceof StaleWriteError ? e.current : undefined;
        if (attempt === 0 && server) {
          current = server as unknown as WorkspaceDefaults;
          continue;
        }
        throw e;
      }
    }
  }
  /** Batch-watermark recipients (admin-managed, any member reads). `q` matches name, company and email. */
  listContacts(wid: string, query: Partial<WorkspaceContactsQuery> = {}) {
    return this.json<Paginated<WorkspaceContact>>(
      "GET",
      `/entities/${enc(wid)}/contacts`,
      query,
    );
  }
  /** Up to 500 at once; an entry with a known `id` replaces that contact (409 `LIMIT_EXCEEDED` past 500). */
  createContacts(
    wid: string,
    contacts: WorkspaceContactsCreateRequest["contacts"],
  ) {
    return this.json<WorkspaceContact[]>(
      "POST",
      `/entities/${enc(wid)}/contacts`,
      undefined,
      { contacts },
    );
  }
  updateContact(cid: string, patch: WorkspaceContactPatchRequest) {
    return this.json<WorkspaceContact>(
      "PATCH",
      `/entity-contacts/${enc(cid)}`,
      undefined,
      patch,
    );
  }
  deleteContact(cid: string) {
    return this.json<WorkspaceContactDeleteResponse>(
      "DELETE",
      `/entity-contacts/${enc(cid)}`,
    );
  }
  /** The audit log as CSV text (owner/admin; range at most one year). */
  async downloadEntityAudit(
    wid: string,
    range: EntityAuditQuery = {},
  ): Promise<string> {
    const res = await this.send("GET", `/entities/${enc(wid)}/audit.csv`, {
      from: range.from,
      to: range.to,
    });
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return new TextDecoder().decode(res.body);
  }

  // ─── members and invitations (B8) ────────────────────────────────────────

  listMembers(wid: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<Member>>(
      "GET",
      `/entities/${enc(wid)}/members`,
      query,
    );
  }
  /** 403 `ROLE_ESCALATION` above your own role; 409 `LAST_OWNER`. */
  updateMemberRole(wid: string, uid: string, role: Role) {
    return this.json<Member>(
      "PATCH",
      `/entities/${enc(wid)}/members/${enc(uid)}`,
      undefined,
      { role },
    );
  }
  removeMember(wid: string, uid: string) {
    return this.json<{ removed: true }>(
      "DELETE",
      `/entities/${enc(wid)}/members/${enc(uid)}`,
    );
  }
  /** Invite by email. The response never holds the token: it travels by email (slice B12). */
  inviteToEntity(entityId: string, body: InvitationCreateRequest) {
    return this.json<Invitation>(
      "POST",
      `/entities/${enc(entityId)}/invitations`,
      undefined,
      body,
    );
  }
  inviteToProject(pid: string, body: InvitationCreateRequest) {
    return this.json<Invitation>(
      "POST",
      `/projects/${enc(pid)}/invitations`,
      undefined,
      body,
    );
  }
  inviteToDocument(did: string, body: InvitationCreateRequest) {
    return this.json<Invitation>(
      "POST",
      `/documents/${enc(did)}/invitations`,
      undefined,
      body,
    );
  }
  /** One entry point for the three invitation routes. */
  inviteMember(target: ShareTarget, body: InvitationCreateRequest) {
    return target.type === "entity"
      ? this.inviteToEntity(target.id, body)
      : target.type === "project"
        ? this.inviteToProject(target.id, body)
        : this.inviteToDocument(target.id, body);
  }
  listEntityInvitations(entityId: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<Invitation>>(
      "GET",
      `/entities/${enc(entityId)}/invitations`,
      query,
    );
  }
  /** Pending invitations addressed to the signed-in user's verified email. */
  listMyInvitations() {
    return this.json<Invitation[]>("GET", "/me/invitations");
  }
  renewInvitation(iid: string) {
    return this.json<Invitation>("POST", `/invitations/${enc(iid)}/renew`);
  }
  cancelInvitation(iid: string) {
    return this.json<{ cancelled: true }>("DELETE", `/invitations/${enc(iid)}`);
  }
  /** `token` is the one from the email. 410 `INVITATION_INVALID|EXPIRED|CLOSED`, 403 `EMAIL_MISMATCH`. */
  acceptInvitation(token: string) {
    return this.json<InvitationAcceptResult>(
      "POST",
      "/invitations/accept",
      undefined,
      { token },
    );
  }
  /** Accept one of the current user's listed invitations; server checks the caller's verified email. */
  acceptMyInvitation(iid: string) {
    return this.json<InvitationAcceptResult>(
      "POST",
      `/invitations/${enc(iid)}/accept`,
    );
  }
  declineInvitation(iid: string) {
    return this.json<{ declined: true }>(
      "POST",
      `/invitations/${enc(iid)}/decline`,
    );
  }
  /** Projects and documents shared with the caller through grants (outside their own entities). */
  listSharedWithMe(query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<SharedItem>>("GET", "/me/shared", query);
  }

  // ─── document lock (B8) ──────────────────────────────────────────────────

  /** Needs a recent sign-in (401 `REAUTH_REQUIRED` otherwise). */
  lockDocument(did: string) {
    return this.json<DocumentLockResponse>(
      "POST",
      `/documents/${enc(did)}/lock`,
    );
  }
  unlockDocument(did: string) {
    this.unlockTokens.delete(did);
    return this.json<DocumentLockResponse>(
      "DELETE",
      `/documents/${enc(did)}/lock`,
    );
  }
  /**
   * Opens a locked document for this user for 30 minutes; the token is kept and sent as `X-Doc-Unlock` on that document's
   * routes from now on. For the sync socket pass `getUnlockToken` to `SyncClient`.
   */
  async createUnlockSession(did: string) {
    const s = await this.json<UnlockSession>(
      "POST",
      `/documents/${enc(did)}/unlock-session`,
    );
    this.unlockTokens.set(did, s.sessionToken);
    return s;
  }

  // ─── grants and share links (B8) ─────────────────────────────────────────

  listDocumentGrants(did: string) {
    return this.json<ShareGrant[]>("GET", `/documents/${enc(did)}/grants`);
  }
  listProjectGrants(pid: string) {
    return this.json<ShareGrant[]>("GET", `/projects/${enc(pid)}/grants`);
  }
  listGrants(target: { type: "document" | "project"; id: string }) {
    return target.type === "document"
      ? this.listDocumentGrants(target.id)
      : this.listProjectGrants(target.id);
  }
  updateGrant(gid: string, body: GrantUpdateRequest) {
    return this.json<ShareGrant>(
      "PATCH",
      `/grants/${enc(gid)}`,
      undefined,
      body,
    );
  }
  removeGrant(gid: string) {
    return this.json<{ removed: true }>("DELETE", `/grants/${enc(gid)}`);
  }
  /** The token (and so the URL) is in this response and never again. */
  createDocumentShareLink(did: string, body: ShareLinkCreateRequest) {
    return this.json<ShareLinkCreated>(
      "POST",
      `/documents/${enc(did)}/share-links`,
      undefined,
      body,
    );
  }
  createProjectShareLink(pid: string, body: ShareLinkCreateRequest) {
    return this.json<ShareLinkCreated>(
      "POST",
      `/projects/${enc(pid)}/share-links`,
      undefined,
      body,
    );
  }
  createSnapshotShareLink(sid: string, body: ShareLinkCreateRequest) {
    return this.json<ShareLinkCreated>(
      "POST",
      `/snapshots/${enc(sid)}/share-links`,
      undefined,
      body,
    );
  }
  createShareLink(target: ShareLinkTargetRef, body: ShareLinkCreateRequest) {
    return target.type === "document"
      ? this.createDocumentShareLink(target.id, body)
      : target.type === "project"
        ? this.createProjectShareLink(target.id, body)
        : this.createSnapshotShareLink(target.id, body);
  }
  listDocumentShareLinks(did: string) {
    return this.json<ShareLink[]>("GET", `/documents/${enc(did)}/share-links`);
  }
  listProjectShareLinks(pid: string) {
    return this.json<ShareLink[]>("GET", `/projects/${enc(pid)}/share-links`);
  }
  listShareLinks(target: { type: "document" | "project"; id: string }) {
    return target.type === "document"
      ? this.listDocumentShareLinks(target.id)
      : this.listProjectShareLinks(target.id);
  }
  /** Access, general access (anyone/restricted), expiry, password, download and watermark: the URL stays the same. */
  updateShareLink(lid: string, patch: ShareLinkUpdateRequest) {
    return this.json<ShareLink>(
      "PATCH",
      `/share-links/${enc(lid)}`,
      undefined,
      patch,
    );
  }
  /** The old URL fails immediately. Make a new link for a new URL. */
  revokeShareLink(lid: string) {
    return this.json<ShareLinkRevokeResponse>(
      "DELETE",
      `/share-links/${enc(lid)}`,
    );
  }

  // ─── public share links (B8): no user token needed, works signed out ─────

  /** What a link points at (never content). Sent WITHOUT credentials. `ShareLinkExpiredError` when it is dead. */
  resolveShareLink(token: string) {
    return this.json<PublicShareInfo>(
      "GET",
      `/public/share/${enc(token)}`,
      undefined,
      undefined,
      "none",
    );
  }
  /**
   * A 15-minute `linkSession` for a link (also the way to renew one). Sends the signed-in user's token when there is one:
   * a `comment` session is only granted to a signed-in user, anonymous visitors get `view`. 401
   * `SHARE_LINK_PASSWORD_REQUIRED` for a wrong password, 429 after 10 wrong attempts.
   */
  unlockShareLink(token: string, password?: string) {
    return this.json<ShareUnlockResponse>(
      "POST",
      `/share/${enc(token)}/unlock`,
      undefined,
      password === undefined ? {} : { password },
    );
  }
  /**
   * The Yjs state behind a link. Pass the `linkSession` (a password link needs it); without one the request goes out as
   * the signed-in user (restricted links, or a member reading through a link) or anonymously. A project link needs `documentId`.
   */
  getSharedState(
    token: string,
    opts: { linkSession?: string; documentId?: string } = {},
  ) {
    return this.bytes(
      `/share/${enc(token)}/state`,
      { documentId: opts.documentId },
      opts.linkSession ? { bearer: opts.linkSession } : "user",
    );
  }

  // ─── projects ────────────────────────────────────────────────────────────

  listProjects(
    wid: string,
    query: Partial<CursorQuery> & Partial<ProjectListQuery> = {},
  ) {
    return this.json<Paginated<ProjectSummary>>(
      "GET",
      `/entities/${enc(wid)}/projects`,
      query,
    );
  }
  createProject(wid: string, body: ProjectCreateRequest) {
    return this.json<ProjectSummary>(
      "POST",
      `/entities/${enc(wid)}/projects`,
      undefined,
      body,
    );
  }
  getProject(pid: string) {
    return this.json<Project>("GET", `/projects/${enc(pid)}`);
  }
  updateProject(pid: string, patch: ProjectUpdateRequest) {
    return this.json<ProjectSummary>(
      "PATCH",
      `/projects/${enc(pid)}`,
      undefined,
      patch,
    );
  }
  trashProject(pid: string) {
    return this.json<TrashResult>("POST", `/projects/${enc(pid)}/trash`);
  }
  restoreProject(pid: string) {
    return this.json<ProjectSummary>("POST", `/projects/${enc(pid)}/restore`);
  }
  /** Permanently delete a TRASHED project (admin): `confirmName` must equal its name. The delete runs as a `system.purge` job. */
  deleteProject(pid: string, confirmName: string) {
    return this.json<PurgeScheduledResponse>(
      "DELETE",
      `/projects/${enc(pid)}`,
      undefined,
      { confirmName },
    );
  }
  /** Copy a project (folders, documents, optionally snapshots) as a `project.duplicate` job; `job.result.projectId` names the copy. */
  duplicateProject(pid: string, body: ProjectDuplicateRequest) {
    return this.json<Job>(
      "POST",
      `/projects/${enc(pid)}/duplicate`,
      undefined,
      body,
    );
  }
  /** 409 `FOLDER_DEPTH` past 8 levels. */
  createFolder(pid: string, body: ProjectFolderCreateRequest) {
    return this.json<ProjectFolder>(
      "POST",
      `/projects/${enc(pid)}/folders`,
      undefined,
      body,
    );
  }
  /** 409 `FOLDER_CYCLE` when the new parent is the folder itself or one of its subfolders. */
  updateFolder(fid: string, patch: ProjectFolderUpdateRequest) {
    return this.json<ProjectFolder>(
      "PATCH",
      `/project-folders/${enc(fid)}`,
      undefined,
      patch,
    );
  }
  /** Contents (documents and subfolders) move to `moveContentsTo` (`"root"` or a folder id); default: the deleted folder's parent. */
  deleteFolder(fid: string, moveContentsTo?: string) {
    return this.json<ProjectFolderDeleteResponse>(
      "DELETE",
      `/project-folders/${enc(fid)}`,
      { moveContentsTo },
    );
  }

  // ─── Shared Bin (project-level snippets, B14) ────────────────────────────

  listProjectBin(pid: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<ProjectBinItem>>(
      "GET",
      `/projects/${enc(pid)}/bin`,
      query,
    );
  }
  /** Pass a `bin_` `id` to make it idempotent. Notes and tags are stripped from the elements; 409 `LIMIT_EXCEEDED` past 2 MiB. */
  addToProjectBin(pid: string, body: ProjectBinCreateRequest) {
    return this.json<ProjectBinItem>(
      "POST",
      `/projects/${enc(pid)}/bin`,
      undefined,
      body,
    );
  }
  removeFromProjectBin(id: string) {
    return this.json<ProjectBinDeleteResponse>(
      "DELETE",
      `/project-bin-items/${enc(id)}`,
    );
  }

  // ─── documents ───────────────────────────────────────────────────────────

  listDocuments(
    pid: string,
    query: Partial<CursorQuery> & Partial<DocumentListQuery> = {},
  ) {
    return this.json<Paginated<DocumentMeta>>(
      "GET",
      `/projects/${enc(pid)}/documents`,
      query,
    );
  }
  /** Pass `id` (a client-generated `doc_...`) to make creation idempotent. */
  createDocument(pid: string, body: DocumentCreateRequest) {
    return this.json<DocumentMeta>(
      "POST",
      `/projects/${enc(pid)}/documents`,
      undefined,
      body,
    );
  }
  getDocument(did: string) {
    return this.json<DocumentDetail>("GET", `/documents/${enc(did)}`);
  }
  updateDocument(did: string, patch: DocumentUpdateRequest) {
    return this.json<DocumentMeta>(
      "PATCH",
      `/documents/${enc(did)}`,
      undefined,
      patch,
    );
  }
  trashDocument(did: string) {
    return this.json<TrashResult>("POST", `/documents/${enc(did)}/trash`);
  }
  restoreDocument(did: string) {
    return this.json<DocumentMeta>("POST", `/documents/${enc(did)}/restore`);
  }
  /** Permanently delete a TRASHED document with its history (admin). Runs as a `system.purge` job. */
  purgeDocument(did: string) {
    return this.json<PurgeScheduledResponse>(
      "DELETE",
      `/documents/${enc(did)}`,
    );
  }
  /** Another project of the same workspace (403 `MOVE_FORBIDDEN` across entities). Omit `folderId` for the project root. */
  moveDocument(did: string, body: DocumentMoveRequest) {
    return this.json<DocumentMeta>(
      "POST",
      `/documents/${enc(did)}/move`,
      undefined,
      body,
    );
  }
  /** A new document from the live state (epoch 0, element ids kept). */
  duplicateDocument(did: string, body: DocumentDuplicateRequest) {
    return this.json<DocumentMeta>(
      "POST",
      `/documents/${enc(did)}/duplicate`,
      undefined,
      body,
    );
  }
  /**
   * Re-style a document with a template version. `dryRun: true` answers `{unmappedStyles, pageDelta}`; otherwise a
   * `doc.applyTemplate` `Job` (a `pre-template` auto snapshot is taken first); `isApplyTemplateJob` tells them apart. 422
   * `UNMAPPED_STYLES` (`UnmappedStylesError.unmappedStyles`) until every style without a counterpart is in `mapping`.
   */
  applyTemplate(did: string, body: DocumentApplyTemplateRequest) {
    return this.json<ApplyTemplateResponse>(
      "POST",
      `/documents/${enc(did)}/template`,
      undefined,
      body,
    );
  }
  /** Live Yjs V2 state as bytes (`Y.applyUpdateV2`), with the epoch it belongs to. */
  getDocumentState(did: string) {
    return this.bytes(`/documents/${enc(did)}/state`);
  }
  getDocumentContent(did: string) {
    return this.json<DocumentJSON>("GET", `/documents/${enc(did)}/content`);
  }

  // ─── commands and scene reads (live document) ────────────────────────────

  /**
   * Apply a `writing_core` command batch to the live document as ONE Yjs transaction (all or nothing).
   * `baseEpoch` must equal the document's live epoch (409 `EPOCH_MISMATCH` otherwise); `expectedHashes`
   * guards against editing text that changed since it was read (409 `CONTENT_CHANGED`, `details.ids`);
   * `dryRun` reports the effects without applying. An open editor writes through its own Y.Doc instead:
   * this route is for bulk tools and scripts.
   */
  applyCommands(did: string, body: CommandBatchRequest) {
    return this.json<CommandBatchResponse>(
      "POST",
      `/documents/${enc(did)}/commands`,
      undefined,
      body,
    );
  }
  /** One row per scene of the live document (heading, number, synopsis, content hash). */
  getOutline(did: string) {
    return this.json<OutlineResponse>("GET", `/documents/${enc(did)}/outline`);
  }
  /** One scene with its elements. `sceneId` is the scene heading element's id. */
  getScene(did: string, sceneId: string) {
    return this.json<SceneRead>(
      "GET",
      `/documents/${enc(did)}/scenes/${enc(sceneId)}`,
    );
  }
  /** Up to `SCENE_BATCH_MAX` scenes in one round trip (a read, sent as POST for the id list). */
  getScenes(did: string, sceneIds: string[]) {
    return this.json<ScenesBatchResponse>(
      "POST",
      `/documents/${enc(did)}/scenes/batch`,
      undefined,
      { sceneIds },
    );
  }
  /** Up to `ELEMENT_BATCH_MAX` elements in one round trip (a read, sent as POST for the id list). */
  getElements(did: string, elementIds: string[]) {
    return this.json<ElementsBatchResponse>(
      "POST",
      `/documents/${enc(did)}/elements/batch`,
      undefined,
      { elementIds },
    );
  }

  // ─── projection-backed reads, search, reports, packets (B10) ─────────────────
  // `source` on every read is `live` (default), `snapshot:<id>` or `version:<id>`.

  listEntities(did: string, query: Partial<EntityListQuery> = {}) {
    return this.json<Paginated<EntitySummary>>(
      "GET",
      `/documents/${enc(did)}/entities`,
      query,
    );
  }
  getEntity(did: string, eid: string, source?: string) {
    return this.json<EntityDetail>(
      "GET",
      `/documents/${enc(did)}/entities/${enc(eid)}`,
      { source },
    );
  }
  /** What blocks deleting the entity (`total`) and the lists behind *Show usages*; `unassigned` counts uses that name no age or version. */
  getEntityUsage(
    did: string,
    eid: string,
    query: { variantId?: string; source?: string } = {},
  ) {
    return this.json<EntityUsage>(
      "GET",
      `/documents/${enc(did)}/entities/${enc(eid)}/usage`,
      query,
    );
  }
  /** Dialogue Tuner: the entity's speech grouped by scene (`sceneIds` is a comma list). */
  getEntityDialogue(
    did: string,
    eid: string,
    query: { sceneIds?: string[]; source?: string } = {},
  ) {
    return this.json<DialogueSceneView[]>(
      "GET",
      `/documents/${enc(did)}/entities/${enc(eid)}/dialogue`,
      { sceneIds: query.sceneIds?.join(","), source: query.source },
    );
  }
  listTagCategories(did: string, source?: string) {
    return this.json<TagCategoryRow[]>(
      "GET",
      `/documents/${enc(did)}/tag-categories`,
      { source },
    );
  }
  listTags(
    did: string,
    query: {
      sceneId?: string;
      categoryId?: string;
      entityId?: string;
      source?: string;
    } = {},
  ) {
    return this.json<TagRow[]>("GET", `/documents/${enc(did)}/tags`, query);
  }
  listNotes(
    did: string,
    query: {
      sceneId?: string;
      type?: string;
      status?: "open" | "resolved";
      source?: string;
    } = {},
  ) {
    return this.json<NoteSummary[]>(
      "GET",
      `/documents/${enc(did)}/notes`,
      query,
    );
  }
  listBeats(did: string, source?: string) {
    return this.json<BeatRow[]>("GET", `/documents/${enc(did)}/beats`, {
      source,
    });
  }
  getBin(did: string, source?: string) {
    return this.json<BinRow[]>("GET", `/documents/${enc(did)}/bin`, { source });
  }
  listRevisions(did: string, source?: string) {
    return this.json<RevisionsView>("GET", `/documents/${enc(did)}/revisions`, {
      source,
    });
  }
  listChanges(
    did: string,
    query: { authorId?: string; sceneId?: string; source?: string } = {},
  ) {
    return this.json<ChangeRow[]>(
      "GET",
      `/documents/${enc(did)}/changes`,
      query,
    );
  }
  getAlternates(did: string, elementId: string, source?: string) {
    return this.json<AlternatesView>(
      "GET",
      `/documents/${enc(did)}/alternates/${enc(elementId)}`,
      { source },
    );
  }
  getTitlePage(did: string, source?: string) {
    return this.json<TitlePageRead>(
      "GET",
      `/documents/${enc(did)}/title-page`,
      { source },
    );
  }
  getStats(did: string, source?: string) {
    return this.json<StatsRead>("GET", `/documents/${enc(did)}/stats`, {
      source,
    });
  }
  /** Fountain text of the script, or of `sceneIds` / from `fromSceneId`. `nextFromScene` is set when the server cut it at 1 MB: ask again from there. */
  async getFountain(
    did: string,
    query: { sceneIds?: string[]; fromSceneId?: string; source?: string } = {},
  ): Promise<{ text: string; nextFromScene: string | null }> {
    const res = await this.send("GET", `/documents/${enc(did)}/fountain`, {
      sceneIds: query.sceneIds?.join(","),
      fromSceneId: query.fromSceneId,
      source: query.source,
    });
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return {
      text: new TextDecoder().decode(res.body),
      nextFromScene: res.headers["x-next-from-scene"] ?? null,
    };
  }
  listSceneShots(did: string, sceneId: string, source?: string) {
    return this.json<ShotRow[]>(
      "GET",
      `/documents/${enc(did)}/scenes/${enc(sceneId)}/shots`,
      { source },
    );
  }

  /** Resolve up to 200 locators (`#12A`, `@5`, `p47`, `MAYA`, ...) to ids. Ambiguity and misses are results, never errors. */
  resolveLocators(did: string, locators: string[], snapshotId?: string) {
    return this.json<ResolveResult[]>(
      "POST",
      `/documents/${enc(did)}/resolve`,
      undefined,
      { locators, ...(snapshotId ? { snapshotId } : {}) },
    );
  }
  /** One locator: throws `LocatorAmbiguousError` (409), `LocatorNotFoundError` (404) or an `ApiError` `INVALID_LOCATOR` (400). */
  resolveLocator(did: string, ref: string, snapshotId?: string) {
    return this.json<Extract<ResolveResult, { status: "resolved" }>>(
      "GET",
      `/documents/${enc(did)}/resolve`,
      { ref, snapshotId },
    );
  }

  /** Full-text search across the caller's readable documents (scope with `entityId`, `projectId` or `documentId`). */
  search(query: Partial<SearchQuery> & { q: string }) {
    const { types, styleIds, ...rest } = query;
    return this.json<Paginated<SearchHit>>("GET", "/search", {
      ...rest,
      types: types?.join(","),
      styleIds: styleIds?.join(","),
    });
  }
  searchWorkspace(
    wid: string,
    query: Partial<Omit<SearchQuery, "entityId">> & { q: string },
  ) {
    const { types, styleIds, ...rest } = query;
    return this.json<Paginated<SearchHit>>(
      "GET",
      `/entities/${enc(wid)}/search`,
      { ...rest, types: types?.join(","), styleIds: styleIds?.join(",") },
    );
  }
  /** In-document find (text or regex; 400 `INVALID_REGEX`). */
  searchDocument(
    did: string,
    query: Partial<DocumentSearchQuery> & { q: string },
  ) {
    const { styles, characters, ...rest } = query;
    return this.json<DocumentSearchHit[]>(
      "GET",
      `/documents/${enc(did)}/search`,
      { ...rest, styles: styles?.join(","), characters: characters?.join(",") },
    );
  }

  getReportKinds() {
    return this.json<ReportKindInfo[]>("GET", "/reports/kinds");
  }
  /** One report as JSON tables, or a `report.render` `Job` for a document past 200 pages (`isReportJob`). 400 `ReportOptionsInvalidError`, 501 `ReportKindUnavailableError`. */
  getReport(
    did: string,
    kind: ReportKind,
    query: { source?: string; options?: Record<string, unknown> } = {},
  ) {
    return this.json<ReportResult | Job>(
      "GET",
      `/documents/${enc(did)}/reports/${enc(kind)}`,
      {
        source: query.source,
        options: query.options ? JSON.stringify(query.options) : undefined,
      },
    );
  }
  /** `format: "json"` answers the result; `csv`, `pdf` and `html` answer a `report.render` job (poll it, then `getJobOutputs`). */
  createReport(did: string, body: ReportCreateRequest) {
    return this.json<ReportResult | Job>(
      "POST",
      `/documents/${enc(did)}/reports`,
      undefined,
      body,
    );
  }

  /** Production packets (spec 11 §7). `locator` is any locator or raw id; 409 `LocatorAmbiguousError`, 404 `LocatorNotFoundError`, 422 `KIND_MISMATCH`. */
  getScenePacket(did: string, locator: string, query: PacketQuery = {}) {
    return this.json<ScenePacket>(
      "GET",
      `/documents/${enc(did)}/packets/scene/${enc(locator)}`,
      packetQuery(query),
    );
  }
  getCharacterPacket(did: string, locator: string, query: PacketQuery = {}) {
    return this.json<CharacterPacket>(
      "GET",
      `/documents/${enc(did)}/packets/character/${enc(locator)}`,
      packetQuery(query),
    );
  }
  getLocationPacket(did: string, locator: string, query: PacketQuery = {}) {
    return this.json<LocationPacket>(
      "GET",
      `/documents/${enc(did)}/packets/location/${enc(locator)}`,
      packetQuery(query),
    );
  }
  getShotPacket(did: string, locator: string, query: PacketQuery = {}) {
    return this.json<ShotPacket>(
      "GET",
      `/documents/${enc(did)}/packets/shot/${enc(locator)}`,
      packetQuery(query),
    );
  }

  /** Import a script file into a project. The server detects the format from the content. */
  importDocument(pid: string, input: ImportDocumentInput) {
    const { bytes, contentB64, ...rest } = input;
    const body: DocumentImportRequest = {
      ...rest,
      contentB64:
        contentB64 ?? bytesToBase64(toUint8Array(bytes as BinaryInput)),
    };
    return this.json<DocumentImportResult>(
      "POST",
      `/projects/${enc(pid)}/documents/import`,
      undefined,
      body,
    );
  }
  /** Export the live document; the file comes back decoded. */
  async exportDocument(
    did: string,
    format: ExportFormatId,
  ): Promise<ExportedDocument> {
    const r = await this.json<{
      filename: string;
      mimeType: string;
      contentB64: string;
      report: ConversionReport;
      format: ExportFormatId;
    }>("POST", `/documents/${enc(did)}/export`, undefined, { format });
    return {
      filename: r.filename,
      mimeType: r.mimeType,
      bytes: base64ToBytes(r.contentB64),
      report: r.report,
      format: r.format,
    };
  }
  getFormats() {
    return this.json<FormatInfo[]>("GET", "/formats");
  }

  // ─── imports, exports and watermark as jobs (B16) ─────────────────────────

  /** A presigned PUT for a Yjs state blob (`purpose: "state"`, default) or a leaked file for `lookupWatermark`. PUT the bytes with `putUpload`. 413 `IMPORT_TOO_LARGE`. */
  uploadState(body: UploadStateRequest) {
    return this.json<UploadStateResponse>(
      "POST",
      "/uploads/state",
      undefined,
      body,
    );
  }
  /**
   * Step 1 of an import: declares the file (`sizeBytes`, `sha256Hex`) and the target (`targetProjectId`, or `templateTarget` for a template
   * file) and answers `{importId, upload: {url}}`. No job exists yet: `putUpload(upload.url, bytes)`, then `startImport(importId)`.
   * `importFile` does all three. 415 `FormatUnsupportedError` (PDF, DOCX, ...), 503 `OcrUnavailableError` (`ocr: "force"`).
   */
  createImportJob(body: ImportCreateRequest) {
    return this.json<ImportCreateResponse>("POST", "/imports", undefined, body);
  }
  /** Step 3: checks the uploaded bytes and creates the `import.<format>` (or `doc.importOver`) job. Repeating it returns the same job. 409 `UploadIncompleteError` until the PUT is done. */
  startImport(importId: string) {
    return this.json<Job>("POST", `/imports/${enc(importId)}/start`);
  }
  /** Step 1 of replacing a document's content with a file (`pre-import` auto snapshot, then an epoch bump: open editors rebase). Same follow-up as `createImportJob`; 409 `DOCUMENT_BUSY` at start. */
  importOver(did: string, body: ImportOverRequest) {
    return this.json<ImportCreateResponse>(
      "POST",
      `/documents/${enc(did)}/import-over`,
      undefined,
      body,
    );
  }
  /**
   * An `export.<format>` job (or `watermark.batch` with `options.batchWatermark`). Formats: fountain, fdx, json; anything else is 415
   * `FormatUnsupportedError`. Poll with `getJob`/`useJob`, then `getJobOutputs` + `fetchJobOutput`.
   */
  createExportJob(did: string, body: ExportCreateRequest) {
    return this.json<Job>(
      "POST",
      `/documents/${enc(did)}/exports`,
      undefined,
      body,
    );
  }
  /** One file from several documents (`fdx` or `fountain`): the first document's title page and template, bodies in the order given. */
  exportCombined(body: ExportCombinedRequest) {
    return this.json<Job>(
      "POST",
      "/documents/export-combined",
      undefined,
      body,
    );
  }
  /** Which recipient a leaked copy was made for: `{exportId}` or `{pdfUploadKey}` (a file uploaded with `uploadState({purpose: "watermark_lookup"})`). Admins only; 404 `WatermarkNotFoundError`. */
  lookupWatermark(wid: string, body: WatermarkLookupRequest) {
    return this.json<WatermarkLookupResponse>(
      "POST",
      `/entities/${enc(wid)}/watermark-lookup`,
      undefined,
      body,
    );
  }

  /** PUTs bytes to a presigned upload URL (no `Authorization`, like R2). Throws `ApiError` on a refusal (an expired URL is 410 `UPLOAD_EXPIRED`). */
  async putUpload(url: string, bytes: BinaryInput): Promise<void> {
    let res: NetworkResponse;
    try {
      res = await this.opts.network.request({
        method: "PUT",
        url,
        headers: { "Content-Type": "application/octet-stream" },
        body: toUint8Array(bytes),
      });
    } catch (e) {
      throw new ApiError(
        e instanceof Error ? e.message : String(e),
        "NETWORK_ERROR",
        0,
      );
    }
    if (res.status < 200 || res.status >= 300) this.fail(res);
  }

  /** Uploads a state blob or leaked file (`POST /uploads/state`, hash, PUT) and returns its `uploadKey`. */
  async uploadStateBytes(
    bytes: BinaryInput,
    purpose: "state" | "watermark_lookup" = "state",
  ): Promise<string> {
    const data = toUint8Array(bytes);
    const up = await this.uploadState({
      sizeBytes: data.byteLength,
      sha256Hex: await sha256Hex(data),
      purpose,
    });
    await this.putUpload(up.url, data);
    return up.uploadKey;
  }

  /**
   * The whole import flow: declare, upload, start. Resolves with the queued `Job` (`import.<format>`, or `doc.importOver` with a
   * `documentId` target); follow it with `getJob`/`useJob`, then read the created document ids from the outputs (`output.documentId`,
   * the `conversion-report.json` of each).
   */
  async importFile(
    target: ImportFileTarget,
    file: ImportFileInput,
  ): Promise<Job> {
    const bytes = toUint8Array(file.bytes);
    const decl = {
      filename: file.filename,
      sizeBytes: bytes.byteLength,
      sha256Hex: await sha256Hex(bytes),
      ...(file.format ? { format: file.format } : {}),
      ...(file.options ? { options: file.options } : {}),
    };
    const made = target.documentId
      ? await this.importOver(target.documentId, decl)
      : await this.createImportJob({
          targetProjectId: target.projectId as string,
          ...decl,
        });
    await this.putUpload(made.upload.url, bytes);
    return this.startImport(made.importId);
  }

  /** The bytes of a finished job's output: a `data:` URL is decoded locally, a presigned URL is fetched without credentials. */
  async fetchJobOutput(output: Pick<JobOutput, "url">): Promise<Uint8Array> {
    if (output.url.startsWith("data:")) {
      const comma = output.url.indexOf(",");
      const head = output.url.slice(5, comma);
      const body = output.url.slice(comma + 1);
      return head.endsWith(";base64")
        ? base64ToBytes(body)
        : new TextEncoder().encode(decodeURIComponent(body));
    }
    let res: NetworkResponse;
    try {
      res = await this.opts.network.request({ method: "GET", url: output.url });
    } catch (e) {
      throw new ApiError(
        e instanceof Error ? e.message : String(e),
        "NETWORK_ERROR",
        0,
      );
    }
    if (res.status < 200 || res.status >= 300) this.fail(res);
    return res.body;
  }

  // ─── assets and R2 (B11) ───────────────────────────────────────────────────

  /**
   * Step 1 of an upload: declares the file and answers a presigned plan (`{uploadId, assetId, versionId, parts}`; `parts` is
   * empty when `deduplicated` - the workspace already holds these bytes). PUT each part's bytes to its `url` with
   * `putUploadPart` and read the `ETag` it returns, then `completeAssetUpload`. `uploadAsset` runs the whole plan.
   */
  initAssetUpload(wid: string, body: AssetUploadRequest) {
    return this.json<AssetUploadInit>(
      "POST",
      `/entities/${enc(wid)}/assets/uploads`,
      undefined,
      body,
    );
  }
  /** Resume: what the storage already has for this upload (`completedParts`), so only the missing parts need `signAssetUploadParts`. */
  getAssetUpload(uploadId: string) {
    return this.json<AssetUploadStatus>(
      "GET",
      `/assets/uploads/${enc(uploadId)}`,
    );
  }
  /** Fresh presigned URLs for these part numbers (the first ones may have expired, or this is a resume). */
  signAssetUploadParts(uploadId: string, partNumbers: number[]) {
    return this.json<AssetPartsResponse>(
      "POST",
      `/assets/uploads/${enc(uploadId)}/parts`,
      undefined,
      { partNumbers } satisfies AssetPartsRequest,
    );
  }
  /** Step 3: the server assembles the parts, re-hashes by streaming, sniffs the type and enqueues `asset.derive` (a documented stub: see the API's CLAUDE.md). Idempotent. */
  completeAssetUpload(uploadId: string, body: AssetCompleteRequest) {
    return this.json<AssetSummary>(
      "POST",
      `/assets/uploads/${enc(uploadId)}/complete`,
      undefined,
      body,
    );
  }
  /** Aborts an unfinished upload; a brand-new asset with no other version is removed with it. */
  abortAssetUpload(uploadId: string) {
    return this.json<AssetAbortResponse>(
      "DELETE",
      `/assets/uploads/${enc(uploadId)}`,
    );
  }
  /** `?entityId=` is required for a user (a key defaults to its own workspace). */
  listAssets(query: Partial<AssetListQuery> = {}) {
    return this.json<Paginated<AssetListItem>>(
      "GET",
      "/assets",
      query as Query,
    );
  }
  getAsset(aid: string) {
    return this.json<AssetDetail>("GET", `/assets/${enc(aid)}`);
  }
  /** A signed GET of the original (`variant` default) or a named derivative (`thumb_256`, `preview_1600`, ...); 409 `AssetNotReadyError` when that variant does not exist (`asset.derive` is disabled by default: only `original` ever will). */
  getAssetUrl(aid: string, vid: string, query: Partial<AssetUrlQuery> = {}) {
    return this.json<AssetUrlResponse>(
      "GET",
      `/assets/${enc(aid)}/versions/${enc(vid)}/url`,
      query as Query,
    );
  }
  /** `rights` changes create no new version; provenance is immutable per version. */
  updateAsset(aid: string, body: AssetUpdateRequest) {
    return this.json<AssetSummary>(
      "PATCH",
      `/assets/${enc(aid)}`,
      undefined,
      body,
    );
  }
  /** Soft delete; refused (409 `AssetInUseError`) while any live link still points at it. Restorable for 30 days. */
  deleteAsset(aid: string) {
    return this.json<AssetDeleteResponse>("DELETE", `/assets/${enc(aid)}`);
  }
  restoreAsset(aid: string) {
    return this.json<AssetSummary>("POST", `/assets/${enc(aid)}/restore`);
  }
  /** 404 `TARGET_NOT_FOUND`, 422 `RoleNotAllowedForTargetError`. `documentId` omitted = a workspace-level link (`target: {kind: "document", id: <the workspace id>}`). */
  createAssetLink(body: AssetLinkCreateRequest) {
    return this.json<AssetLink>("POST", "/asset-links", undefined, body);
  }
  listDocumentAssetLinks(
    did: string,
    query: Partial<DocumentAssetLinksQuery> = {},
  ) {
    return this.json<AssetLinkWithStaleness[]>(
      "GET",
      `/documents/${enc(did)}/asset-links`,
      query as Query,
    );
  }
  updateAssetLink(lid: string, body: AssetLinkUpdateRequest) {
    return this.json<AssetLink>(
      "PATCH",
      `/asset-links/${enc(lid)}`,
      undefined,
      body,
    );
  }
  /** Soft delete of the link only (the asset is untouched). */
  unlinkAsset(lid: string) {
    return this.json<AssetLinkDeleteResponse>(
      "DELETE",
      `/asset-links/${enc(lid)}`,
    );
  }
  /** Per-target fresh/stale/deleted counts, for a Navigator "Media" column or similar badges. */
  getDocumentStaleness(
    did: string,
    query: Partial<DocumentStalenessQuery> = {},
  ) {
    return this.json<TargetStaleness[]>(
      "GET",
      `/documents/${enc(did)}/staleness`,
      query as Query,
    );
  }
  getAssetLinkStaleness(lid: string) {
    return this.json<LinkStaleness>(
      "GET",
      `/asset-links/${enc(lid)}/staleness`,
    );
  }

  /** PUTs one multipart part and returns its `ETag` (unquoted), read from the response header. */
  private async putUploadPart(url: string, bytes: Uint8Array): Promise<string> {
    let res: NetworkResponse;
    try {
      res = await this.opts.network.request({
        method: "PUT",
        url,
        body: bytes,
      });
    } catch (e) {
      throw new ApiError(
        e instanceof Error ? e.message : String(e),
        "NETWORK_ERROR",
        0,
      );
    }
    if (res.status < 200 || res.status >= 300) this.fail(res);
    const etag = res.headers["etag"] ?? res.headers["ETag"];
    if (!etag)
      throw new ApiError(
        "The upload did not return an ETag for this part",
        "BAD_RESPONSE",
        res.status,
      );
    return etag.replace(/"/g, "");
  }

  /**
   * The whole multipart upload plan for one file: init (or resume), PUT every part (`opts.concurrency`, default
   * `ASSET_UPLOAD_CONCURRENCY` = 3, at a time; each retried `opts.partRetries` times, default 3), then complete.
   * Resolves with the finished `AssetSummary` (`status: "ready"` unless `asset.derive` is enabled and still running).
   *
   * A part that never recovers throws `AssetUploadInterruptedError(uploadId, cause)`: persist `uploadId` (and the file, or
   * enough to re-open it) and later call `uploadAsset(wid, file, {..., resumeUploadId: uploadId})` to pick up only the
   * missing parts (`getAssetUpload` under the hood: no bytes already accepted by the storage are sent again).
   *
   * Whole-file `sha256Hex` is computed up front (enables server-side dedup before any bytes are sent) only when the file is
   * at most 64 MiB; past that it is left for the server's own streaming re-hash at `complete` (large media is never fully
   * buffered twice by this helper).
   */
  async uploadAsset(
    wid: string,
    file: UploadableFile,
    opts: UploadAssetOptions,
  ): Promise<AssetSummary> {
    const { blob, name, type, size } = await resolveUploadable(file);
    const sha256Hex =
      size <= PREHASH_MAX_BYTES ? await sha256HexOfBlob(blob) : undefined;

    let uploadId: string;
    let partSizeBytes: number;
    let pending: AssetPartUrl[];
    let deduplicated: boolean;
    const completed: {
      partNumber: number;
      etag: string;
      sizeBytes?: number;
    }[] = [];

    if (opts.resumeUploadId) {
      const status = await this.getAssetUpload(opts.resumeUploadId);
      uploadId = status.uploadId;
      partSizeBytes = status.partSizeBytes;
      completed.push(
        ...status.completedParts.map((c) => ({
          partNumber: c.partNumber,
          etag: c.etag,
          sizeBytes: c.sizeBytes,
        })),
      );
      if (status.completedAt) {
        opts.onProgress?.(1);
        return this.completeAssetUpload(uploadId, { parts: [] });
      }
      const have = new Set(completed.map((c) => c.partNumber));
      const missing = Array.from(
        { length: status.partCount },
        (_, i) => i + 1,
      ).filter((n) => !have.has(n));
      pending = missing.length
        ? (await this.signAssetUploadParts(uploadId, missing)).parts
        : [];
      deduplicated = status.partCount === 0;
    } else {
      const init = await this.initAssetUpload(wid, {
        assetId: opts.assetId,
        filename: name,
        mimeType: type,
        sizeBytes: size,
        sha256Hex,
        kind: opts.kind,
        title: opts.title,
        parentVersionId: opts.parentVersionId,
        provenance: opts.provenance,
        rights: opts.rights,
      });
      uploadId = init.uploadId;
      partSizeBytes = init.partSizeBytes;
      pending = init.parts;
      deduplicated = init.deduplicated;
    }

    opts.onProgress?.(0);
    if (!deduplicated && pending.length > 0) {
      // resumed parts already accepted by the storage count toward progress too (their size: every part is `partSizeBytes` except a short last one)
      let sent = completed.reduce(
        (a, c) =>
          a +
          (c.sizeBytes ??
            (c.partNumber < Math.ceil(size / partSizeBytes)
              ? partSizeBytes
              : size - (c.partNumber - 1) * partSizeBytes)),
        0,
      );
      let cursor = 0;
      const concurrency = Math.max(
        1,
        Math.min(opts.concurrency ?? ASSET_UPLOAD_CONCURRENCY, pending.length),
      );
      const retries = Math.max(0, opts.partRetries ?? 3);
      const worker = async (): Promise<void> => {
        for (;;) {
          const i = cursor++;
          if (i >= pending.length) return;
          const part = pending[i]!;
          const start = (part.partNumber - 1) * partSizeBytes;
          const end = Math.min(size, start + partSizeBytes);
          const chunk = new Uint8Array(
            await blob.slice(start, end).arrayBuffer(),
          );
          let attempt = 0;
          for (;;) {
            opts.signal?.throwIfAborted();
            try {
              const etag = await this.putUploadPart(part.url, chunk);
              completed.push({ partNumber: part.partNumber, etag });
              sent += chunk.byteLength;
              opts.onProgress?.(Math.min(0.99, sent / size));
              break;
            } catch (e) {
              if (attempt++ >= retries) throw e;
            }
          }
        }
      };
      try {
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
      } catch (e) {
        throw new AssetUploadInterruptedError(
          `The upload (${uploadId}) stopped before every part finished`,
          uploadId,
          e,
        );
      }
    }
    const asset = await this.completeAssetUpload(uploadId, {
      parts: completed,
      sha256Hex,
    });
    opts.onProgress?.(1);
    return asset;
  }

  // ─── templates ───────────────────────────────────────────────────────────

  /**
   * Built-ins plus the caller's own (`user`) and their entities' (`workspace`) templates. `filter` is a category or
   * `{category?, entityId?, scope?, locale?}` (`entityId` narrows the workspace ones to that workspace;
   * `locale` narrows built-ins to one BCP-47 language — `user`/`workspace` templates are never filtered by it).
   */
  listTemplates(filter?: string | Partial<TemplateListQuery>) {
    const q: Partial<TemplateListQuery> =
      typeof filter === "string" ? { category: filter } : (filter ?? {});
    return this.json<TemplateSummary[]>("GET", "/templates", {
      category: q.category,
      entityId: q.entityId,
      scope: q.scope,
      locale: q.locale,
    });
  }
  /** Full template body; `idOrKey` is the template id or its built-in key; `version` an older version of a stored template. */
  getTemplate(idOrKey: string, version?: number) {
    return this.json<TemplateJSON>("GET", `/templates/${enc(idOrKey)}`, {
      version,
    });
  }
  /** Version 1 of a `user` or `workspace` template. 422 `TEMPLATE_INVALID` (`TemplateInvalidError.issues`). */
  createTemplate(body: TemplateCreateRequest) {
    return this.json<TemplateSummary>("POST", "/templates", undefined, body);
  }
  /** Version n+1 (old versions never change; documents update only when they apply it). 409 `BUILTIN_IMMUTABLE`. */
  createTemplateVersion(
    tid: string,
    template: TemplateVersionCreateRequest["template"],
  ) {
    return this.json<TemplateSummary>(
      "POST",
      `/templates/${enc(tid)}/versions`,
      undefined,
      { template },
    );
  }
  updateTemplate(tid: string, patch: TemplateUpdateRequest) {
    return this.json<TemplateSummary>(
      "PATCH",
      `/templates/${enc(tid)}`,
      undefined,
      patch,
    );
  }
  /** Archives it: hidden from lists, cannot start documents; existing documents keep their copy. */
  deleteTemplate(tid: string) {
    return this.json<TemplateArchiveResponse>(
      "DELETE",
      `/templates/${enc(tid)}`,
    );
  }
  /**
   * A `.fwtemplate` / `.fwtemplate.json` file, inline or by `{importId}` (upload flow: `createImportJob({templateTarget})`, `putUpload`,
   * then this). `.fadein.template` and `.fdxt` answer 400 `UNSUPPORTED_FORMAT` (not built yet).
   */
  importTemplate(input: ImportTemplateArg) {
    if ("importId" in input)
      return this.json<TemplateSummary>(
        "POST",
        "/templates/import",
        undefined,
        { importId: input.importId },
      );
    const { bytes, contentB64, ...rest } = input;
    return this.json<TemplateSummary>("POST", "/templates/import", undefined, {
      ...rest,
      contentB64:
        contentB64 ?? bytesToBase64(toUint8Array(bytes as BinaryInput)),
    });
  }
  /** The template as a `.fwtemplate.json` file (`fadein-template` and `fdxt` are 400 `UNSUPPORTED_FORMAT`). */
  async exportTemplate(
    tid: string,
    opts: { format?: TemplateFileFormat | "json"; version?: number } = {},
  ): Promise<ExportedTemplate> {
    const r = await this.json<TemplateExportResponse>(
      "GET",
      `/templates/${enc(tid)}/export`,
      { format: opts.format, version: opts.version },
    );
    return {
      filename: r.filename,
      mimeType: r.mimeType,
      bytes: base64ToBytes(r.contentB64),
      format: r.format,
    };
  }

  // ─── versions ────────────────────────────────────────────────────────────

  listVersions(did: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<VersionListItem>>(
      "GET",
      `/documents/${enc(did)}/versions`,
      query,
    );
  }
  getVersionState(did: string, vid: string) {
    return this.bytes(`/documents/${enc(did)}/versions/${enc(vid)}/state`);
  }
  /** Bumps the document epoch: subscribed sync clients get `epochChanged`. */
  restoreVersion(did: string, vid: string) {
    return this.json<VersionRestoreResponse>(
      "POST",
      `/documents/${enc(did)}/versions/${enc(vid)}/restore`,
    );
  }
  /** Pin a version point as a manual snapshot. */
  snapshotVersion(did: string, vid: string, body: VersionSnapshotRequest) {
    return this.json<SnapshotSummary>(
      "POST",
      `/documents/${enc(did)}/versions/${enc(vid)}/snapshot`,
      undefined,
      body,
    );
  }

  /**
   * B15: a NEW document (epoch 0, same element ids, `forkedFrom` in its meta) from a version point. The source is untouched:
   * no epoch bump, no pre-restore snapshot, so no open editor rebases. Needs `version.restoreAsCopy` (writer) and `document.create`.
   */
  restoreVersionAsCopy(
    did: string,
    vid: string,
    body: VersionRestoreAsCopyRequest,
  ) {
    return this.json<DocumentMeta>(
      "POST",
      `/documents/${enc(did)}/versions/${enc(vid)}/restore-as-copy`,
      undefined,
      body,
    );
  }
  /** Per-line history of one element, newest first: `update` entries (author sessions, last 7 days of the raw log) then `version` points. */
  getElementHistory(
    did: string,
    elementId: string,
    query: Partial<CursorQuery> = {},
  ) {
    return this.json<Paginated<ElementHistoryEntry>>(
      "GET",
      `/documents/${enc(did)}/elements/${enc(elementId)}/history`,
      query,
    );
  }
  /** Who has the document open right now (one entry per device). */
  getPresence(did: string) {
    return this.json<PresenceEntry[]>("GET", `/documents/${enc(did)}/presence`);
  }
  /**
   * Element-level diff of any two `SourceRef`s (live, snapshot, version). `granularity` `scene` | `element` (default) | `word`. Answers are cached
   * server-side per (base, target, options). 413 `COMPARE_TOO_LARGE` (`CompareTooLargeError`) past 400 combined pages.
   */
  compare(did: string, body: CompareRequest) {
    return this.json<DocumentDiff>(
      "POST",
      `/documents/${enc(did)}/compare`,
      undefined,
      body,
    );
  }

  // ─── snapshots ───────────────────────────────────────────────────────────

  listSnapshots(did: string, opts: { includeAutomatic?: boolean } = {}) {
    return this.json<SnapshotListResponse>(
      "GET",
      `/documents/${enc(did)}/snapshots`,
      {
        includeAutomatic: opts.includeAutomatic,
      },
    );
  }
  createSnapshot(did: string, body: SnapshotCreateRequest) {
    return this.json<SnapshotCreateResponse>(
      "POST",
      `/documents/${enc(did)}/snapshots`,
      undefined,
      body,
    );
  }
  getSnapshot(sid: string) {
    return this.json<SnapshotDetail>("GET", `/snapshots/${enc(sid)}`);
  }
  getSnapshotState(sid: string) {
    return this.bytes(`/snapshots/${enc(sid)}/state`);
  }
  getSnapshotContent(sid: string) {
    return this.json<DocumentJSON>("GET", `/snapshots/${enc(sid)}/content`);
  }
  /** Replaces the live document with the snapshot and bumps the epoch. */
  openSnapshot(sid: string) {
    return this.json<SnapshotOpenResponse>(
      "POST",
      `/snapshots/${enc(sid)}/open`,
      undefined,
      { confirm: true },
    );
  }
  forkSnapshot(sid: string, body: SnapshotForkRequest) {
    return this.json<DocumentMeta>(
      "POST",
      `/snapshots/${enc(sid)}/fork`,
      undefined,
      body,
    );
  }
  /** Hide or show a snapshot for the caller only (`snapshot_user_prefs`; the snapshot never changes). */
  setSnapshotPrefs(sid: string, hidden: boolean) {
    return this.json<SnapshotPrefsResponse>(
      "PUT",
      `/snapshots/${enc(sid)}/prefs`,
      undefined,
      { hidden } satisfies SnapshotPrefsRequest,
    );
  }
  /** Oldest first. */
  listSnapshotNotes(sid: string) {
    return this.json<SnapshotNote[]>("GET", `/snapshots/${enc(sid)}/notes`);
  }
  /** Append-only (no edit, no delete); 409 `LIMIT_EXCEEDED` (`LimitExceededError`, `.limit` 200) past 200 per snapshot. */
  addSnapshotNote(sid: string, body: string) {
    return this.json<SnapshotNote>(
      "POST",
      `/snapshots/${enc(sid)}/notes`,
      undefined,
      { body } satisfies SnapshotNoteCreateRequest,
    );
  }
  listSnapshotComments(sid: string, query: Partial<CursorQuery> = {}) {
    return this.json<Paginated<SnapshotComment>>(
      "GET",
      `/snapshots/${enc(sid)}/comments`,
      query,
    );
  }
  /** Review comment on an immutable snapshot (`document.comment`); 404 `ANCHOR_NOT_FOUND` (`AnchorNotFoundError`) if the anchor does not resolve in it. */
  addSnapshotComment(sid: string, body: SnapshotCommentCreateRequest) {
    return this.json<SnapshotComment>(
      "POST",
      `/snapshots/${enc(sid)}/comments`,
      undefined,
      body,
    );
  }
  /** Turns the comment into a note in the LIVE document (writer); 404 `ANCHOR_NOT_FOUND` when the commented text is gone. Idempotent. */
  copyCommentToLive(cid: string) {
    return this.json<CopyToLiveResponse>(
      "POST",
      `/snapshot-comments/${enc(cid)}/copy-to-live`,
    );
  }
  resolveSnapshotComment(cid: string, resolved: boolean) {
    return this.json<SnapshotComment>(
      "POST",
      `/snapshot-comments/${enc(cid)}/resolve`,
      undefined,
      { resolved } satisfies SnapshotCommentResolveRequest,
    );
  }
  /**
   * Offline-edits (and any client-side) snapshot: uploads `state` (a Yjs V2 update of the replica, exactly what the writer saw) through
   * `/uploads/state` and files it. With `sourceEpoch` older than the live epoch it is stored under `assumedParentId`, never re-parents
   * the live document and is never merged into it (spec 03 §6.3). Idempotent on `clientSnapshotId` (use `offline-edits:<deviceId>:<oldEpoch>`).
   */
  async createSnapshotFromState(
    did: string,
    state: Uint8Array,
    body: Omit<SnapshotCreateRequest, "state">,
  ) {
    const uploadKey = await this.uploadStateBytes(state);
    return this.createSnapshot(did, { ...body, state: { uploadKey } });
  }

  // ─── API keys (B6) ───────────────────────────────────────────────────────

  /** The caller's personal API keys (never the secrets). User sign-in only: a key gets 403. */
  listApiKeys() {
    return this.json<ApiKeySummary[]>("GET", "/api-keys");
  }
  /** The full `key` is in this response and never again. */
  createApiKey(body: ApiKeyCreateRequest) {
    return this.json<ApiKeyCreated>("POST", "/api-keys", undefined, body);
  }
  updateApiKey(kid: string, body: ApiKeyUpdateRequest) {
    return this.json<ApiKeySummary>(
      "PATCH",
      `/api-keys/${enc(kid)}`,
      undefined,
      body,
    );
  }
  revokeApiKey(kid: string) {
    return this.json<ApiKeyRevokeResponse>("DELETE", `/api-keys/${enc(kid)}`);
  }

  // ─── account and per-user data (B13) ─────────────────────────────────────

  /** The user's preferences plus `updatedAt`, the token `setPreferences` sends back as `baseUpdatedAt`. */
  getPreferences() {
    return this.json<UserPreferencesResponse>("GET", "/me/preferences");
  }
  /**
   * Sets top-level preference keys (`null` removes one) on top of the server copy: a whole-document PUT guarded by
   * `baseUpdatedAt`. Pass `base` (the last `getPreferences` / `setPreferences` result) to skip the read. On 409 `STALE_WRITE`
   * (another device wrote first) the server copy in `details.current` is merged per top-level key, this call's keys winning,
   * and the PUT is retried once; a second `StaleWriteError` reaches the caller. Returns the resulting document.
   */
  async setPreferences(
    update: UserPreferencesUpdate,
    base?: UserPreferencesResponse,
  ): Promise<UserPreferencesResponse> {
    let current = base ?? (await this.getPreferences());
    for (let attempt = 0; ; attempt++) {
      const next = mergeTopLevel<UserPreferences>(current, update as never);
      try {
        const put = await this.json<UserPreferencesPutResponse>(
          "PUT",
          "/me/preferences",
          undefined,
          { ...next, baseUpdatedAt: current.updatedAt },
        );
        return { ...next, updatedAt: put.updatedAt };
      } catch (e) {
        const server = e instanceof StaleWriteError ? e.current : undefined;
        if (attempt === 0 && server) {
          current = server as UserPreferencesResponse;
          continue;
        }
        throw e;
      }
    }
  }

  /** The synced spelling dictionary, sorted. */
  getDictionary() {
    return this.json<DictionaryResponse>("GET", "/me/dictionary");
  }
  /** Adds and removes words in one call; answers the new word count. 409 `LIMIT_EXCEEDED` past 50,000. */
  updateDictionary(body: DictionaryUpdateRequest) {
    return this.json<DictionaryUpdateResponse>(
      "PUT",
      "/me/dictionary",
      undefined,
      body,
    );
  }

  listMacros() {
    return this.json<UserMacro[]>("GET", "/me/macros");
  }
  /** 409 `MACRO_TRIGGER_TAKEN` (a `MacroTriggerTakenError`) when the shortcut or alias is in use, 409 `LIMIT_EXCEEDED` past 500. */
  createMacro(body: UserMacroCreateRequest) {
    return this.json<UserMacro>("POST", "/me/macros", undefined, body);
  }
  updateMacro(mid: string, patch: UserMacroPatchRequest) {
    return this.json<UserMacro>(
      "PATCH",
      `/me/macros/${enc(mid)}`,
      undefined,
      patch,
    );
  }
  deleteMacro(mid: string) {
    return this.json<DeleteResponse>("DELETE", `/me/macros/${enc(mid)}`);
  }

  /** Buckets (zero-filled) and streak in the user's time zone; default the last 30 days by day. */
  getWritingStats(query: WritingStatsQuery = {}) {
    return this.json<WritingStats>("GET", "/me/writing-stats", {
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      documentId: query.documentId,
    });
  }
  /**
   * Idempotent on `clientSessionId` (make one with `newWritingSessionId()` when the session starts): a device may upload a
   * session recorded offline whenever it is back online, and may retry freely; a repeat changes nothing.
   */
  recordWritingSession(body: WritingSessionRequest) {
    return this.json<WritingSessionResponse>(
      "POST",
      "/me/writing-sessions",
      undefined,
      body,
    );
  }
  getWritingGoals() {
    return this.json<WritingGoal[]>("GET", "/me/writing-goals");
  }
  /** Replaces the whole list (a goal left out is deleted, one without `id` is created); 409 `LIMIT_EXCEEDED` past 50. */
  setWritingGoals(goals: WritingGoalInput[]) {
    return this.json<WritingGoal[]>("PUT", "/me/writing-goals", undefined, {
      goals,
    });
  }

  /** Starts the `account.export` job (one at a time: 409 `JOB_ALREADY_RUNNING`). Follow it with `getJob` / `useJob`, then `getJobOutputs`. */
  requestAccountExport() {
    return this.json<Job>("POST", "/me/export");
  }
  /**
   * Schedules the account for deletion (30-day grace, `restoreAccount` cancels). Needs a sign-in within 5 minutes
   * (`ReauthRequiredError`) and no team workspace the person solely owns (`OwnsTeamWorkspaceError`, `.entities`).
   */
  deleteAccount() {
    return this.json<AccountDeleteResponse>("DELETE", "/me", undefined, {
      confirm: ACCOUNT_DELETE_CONFIRM,
    });
  }
  restoreAccount() {
    return this.json<AccountRestoreResponse>("POST", "/me/restore");
  }

  /** The caller's own view state of a document (`{}` until first saved). A viewer may read and save theirs. */
  getMyDocumentState(did: string) {
    return this.json<DocumentViewStateResponse>(
      "GET",
      `/documents/${enc(did)}/my-state`,
    );
  }
  /** Same merge-and-retry-once as `setPreferences`, per top-level key (`navigator`, `layout`, `views`). The lib debounces calls. */
  async setMyDocumentState(
    did: string,
    update: DocumentViewStateUpdate,
    base?: DocumentViewStateResponse,
  ): Promise<DocumentViewStateResponse> {
    let current = base ?? (await this.getMyDocumentState(did));
    for (let attempt = 0; ; attempt++) {
      const next = mergeTopLevel<DocumentViewState>(current, update as never);
      try {
        const put = await this.json<DocumentViewStatePutResponse>(
          "PUT",
          `/documents/${enc(did)}/my-state`,
          undefined,
          { ...next, baseUpdatedAt: current.updatedAt ?? null },
        );
        return { ...next, updatedAt: put.updatedAt };
      } catch (e) {
        const server = e instanceof StaleWriteError ? e.current : undefined;
        if (attempt === 0 && server) {
          current = server as DocumentViewStateResponse;
          continue;
        }
        throw e;
      }
    }
  }
  /** Stars are per user; both calls are idempotent and need only `document.read`. */
  starDocument(did: string) {
    return this.json<StarResponse>("PUT", `/documents/${enc(did)}/star`);
  }
  unstarDocument(did: string) {
    return this.json<StarResponse>("DELETE", `/documents/${enc(did)}/star`);
  }

  // ─── AI (B7) ─────────────────────────────────────────────────────────────

  /** Whether AI can run: `fixture` = canned test-mode answers, `live` = ShapeShyft, `unavailable` = not configured. */
  getAiStatus() {
    return this.json<AiStatus>("GET", "/ai/status");
  }
  // ─── jobs (B9) ───────────────────────────────────────────────────────────

  /** The caller's jobs (or, with `documentId`, every job on a document they can read). `kind` is exact or a family prefix like `ai.`. */
  listJobs(query: JobListQuery = {}) {
    return this.json<Paginated<Job>>("GET", "/jobs", query as Query);
  }
  /** A job's status and progress (never its request or result). `wait` (seconds, max 120) long-polls until status or progress stage changes. */
  getJob(jobId: string, opts: { wait?: number } = {}) {
    return this.json<Job>("GET", `/jobs/${enc(jobId)}`, { wait: opts.wait });
  }
  /**
   * Create a job of a generic kind (202). Sends an `Idempotency-Key` (`body.idempotencyKey` when given, else a fresh one) and the same
   * key in the body, so a retried or replayed create returns the original job. AI kinds use `startAiJob`; export/import kinds their own routes.
   * Errors: 501 `JOB_KIND_DISABLED` (`JobKindDisabledError`), 400 `JOB_KIND_NOT_GENERIC`, 409 `IDEMPOTENCY_KEY_REUSED`.
   */
  createJob(body: JobCreateRequest & { dryRun?: false }): Promise<Job>;
  createJob(
    body: JobCreateRequest & { dryRun: true },
  ): Promise<JobDryRunResponse>;
  createJob(body: JobCreateRequest): Promise<Job | JobDryRunResponse>;
  createJob(body: JobCreateRequest): Promise<Job | JobDryRunResponse> {
    const key =
      body.idempotencyKey ??
      (this.opts.newIdempotencyKey ?? newIdempotencyKey)();
    return this.json<Job | JobDryRunResponse>(
      "POST",
      "/jobs",
      undefined,
      { ...body, idempotencyKey: key },
      "user",
      key,
    );
  }
  /** Owner only. A queued job is cancelled at once; a running one reports `cancelRequested` and stops shortly. 409 `JOB_FINISHED` when done. */
  cancelJob(jobId: string) {
    return this.json<Job>("POST", `/jobs/${enc(jobId)}/cancel`);
  }
  /** Download URLs of a finished job's outputs (owner only). 409 `JOB_NOT_FINISHED` / `JOB_FAILED`. */
  getJobOutputs(jobId: string) {
    return this.json<JobOutputsResponse>("GET", `/jobs/${enc(jobId)}/outputs`);
  }
  /** Batch-watermark recipients of a job (owner only; not for API keys). */
  listJobRecipients(jobId: string) {
    return this.json<JobRecipient[]>("GET", `/jobs/${enc(jobId)}/recipients`);
  }

  /** Starts a review or polish job (202). Poll `getAiJob`. */
  startAiJob(did: string, body: AiJobCreateRequest) {
    return this.json<AiJobCreated>(
      "POST",
      `/documents/${enc(did)}/ai/jobs`,
      undefined,
      body,
    );
  }
  /** Recent jobs of a document, newest first (a finished report is in `result`). */
  listAiJobs(did: string, limit?: number) {
    return this.json<{ items: AiJob[] }>(
      "GET",
      `/documents/${enc(did)}/ai/jobs`,
      { limit },
    );
  }
  getAiJob(jobId: string) {
    return this.json<AiJob>("GET", `/ai/jobs/${enc(jobId)}`);
  }
  cancelAiJob(jobId: string) {
    return this.json<AiJob>("POST", `/ai/jobs/${enc(jobId)}/cancel`);
  }
  listSuggestionSets(did: string) {
    return this.json<{ items: SuggestionSetSummary[] }>(
      "GET",
      `/documents/${enc(did)}/ai/suggestion-sets`,
    );
  }
  getSuggestionSet(ssid: string) {
    return this.json<SuggestionSet>("GET", `/ai/suggestion-sets/${enc(ssid)}`);
  }
  /** Atomic: one stale suggestion refuses the whole batch with `ApiError` 409 `CONTENT_CHANGED` (`details.suggestionIds`). */
  acceptSuggestions(ssid: string, suggestionIds: string[]) {
    return this.json<SuggestionAcceptResponse>(
      "POST",
      `/ai/suggestion-sets/${enc(ssid)}/accept`,
      undefined,
      { suggestionIds },
    );
  }
  /** No ids rejects every pending suggestion in the set. */
  rejectSuggestions(ssid: string, suggestionIds?: string[]) {
    return this.json<SuggestionSet>(
      "POST",
      `/ai/suggestion-sets/${enc(ssid)}/reject`,
      undefined,
      suggestionIds ? { suggestionIds } : {},
    );
  }
  /** Combined accept-and-reject in one call, with `dryRun` and `"allPending"`. Accept stays atomic (one stale
   *  suggestion is reported in `skippedStale`, not a thrown error); a bulk accept auto-snapshots first. */
  decideSuggestions(ssid: string, body: SuggestionDecideRequest) {
    return this.json<SuggestionDecideResponse>(
      "POST",
      `/ai/suggestion-sets/${enc(ssid)}/decide`,
      undefined,
      body,
    );
  }

  // ─── B17 AI completion and credits ────────────────────────────────────────

  getAiConsent() {
    return this.json<AiConsentStatus>("GET", "/me/ai-consents");
  }
  /** `version` must equal the server's current `AI_CONSENT_VERSION` (from `getAiConsent()`), else `ApiError` `VALIDATION`. */
  acceptAiConsent(body: AiConsentAcceptRequest) {
    return this.json<AiConsentAcceptResponse>(
      "POST",
      "/me/ai-consents",
      undefined,
      body,
    );
  }
  listMyAiActivity(
    query: { limit?: number; cursor?: string; documentId?: string } = {},
  ) {
    return this.json<Paginated<AiActivityItem>>(
      "GET",
      "/me/ai-activity",
      query as Query,
    );
  }
  listWorkspaceAiActivity(
    wid: string,
    query: {
      limit?: number;
      cursor?: string;
      userId?: string;
      documentId?: string;
    } = {},
  ) {
    return this.json<Paginated<AiActivityItem & { userId: string }>>(
      "GET",
      `/entities/${enc(wid)}/ai-activity`,
      query as Query,
    );
  }
  /** The live credit estimate before the user confirms, computed with the same pricing function the eventual charge uses. */
  estimateAiJob(did: string, body: AiEstimateRequest) {
    return this.json<AiEstimateResponse>(
      "POST",
      `/documents/${enc(did)}/ai/estimate`,
      undefined,
      body,
    );
  }
  listAiReports(
    did: string,
    query: { limit?: number; cursor?: string; task?: string } = {},
  ) {
    return this.json<Paginated<AiReportSummary>>(
      "GET",
      `/documents/${enc(did)}/ai/reports`,
      query as Query,
    );
  }
  getAiReport(did: string, jobId: string) {
    return this.json<CoverageReport>(
      "GET",
      `/documents/${enc(did)}/ai/reports/${enc(jobId)}`,
    );
  }
  /** `noteId` is `"strengths:<i>" | "weaknesses:<i>" | "sceneNotes:<i>"` from the report itself (its position, since a report has no independently stable note ids). */
  convertAiNote(did: string, jobId: string, noteId: string) {
    return this.json<AiNoteConvertResponse>(
      "POST",
      `/documents/${enc(did)}/ai/reports/${enc(jobId)}/notes/${enc(noteId)}/convert`,
    );
  }

  // Synchronous AI actions: the call waits for the model and answers `{ result, usage }`. Errors of note:
  // 403 `AI_CONSENT_REQUIRED` (accept via `acceptAiConsent`), 402 `INSUFFICIENT_CREDITS`, 429 `RATE_LIMITED` (daily limit),
  // 503 `AI_UNAVAILABLE`, 502 `AI_OUTPUT_INVALID` / `AI_GENERATION_FAILED` (nothing was charged), 422 `AI_CONTENT_REFUSED`.
  /** A free-form paragraph about a character -> a structured skeleton (`age` plus whichever fields the text supports). */
  generateCharacterSkeleton(body: GenerateCharacterSkeletonRequest) {
    return this.json<AiActionResponse<GenerateCharacterSkeletonResult>>(
      "POST",
      "/ai/generate-character-skeleton",
      undefined,
      body,
    );
  }
  /** A story in plain language -> scenes with structured headings and typed elements. Can take a minute. */
  generateScript(body: GenerateScriptRequest) {
    return this.json<AiActionResponse<GenerateScriptResult>>(
      "POST",
      "/ai/generate-script",
      undefined,
      body,
    );
  }
  /** One character's lines + their skeleton -> the same ids, polished to fit the personality. */
  polishCharacterDialogue(body: PolishCharacterDialogueRequest) {
    return this.json<AiActionResponse<PolishCharacterDialogueResult>>(
      "POST",
      "/ai/polish-character-dialogue",
      undefined,
      body,
    );
  }
  /** A scene + a skeleton per character -> the scene rewritten (a fresh element list, not a per-id mapping). */
  polishScene(body: PolishSceneRequest) {
    return this.json<AiActionResponse<PolishSceneResult>>(
      "POST",
      "/ai/polish-scene",
      undefined,
      body,
    );
  }
  // Smart Paste: text read from the clipboard. The result is applied by the caller, as document commands.
  /** Pasted text -> the characters it describes, each with aliases and one skeleton per life stage. */
  smartPasteCharacters(body: SmartPasteCharactersRequest) {
    return this.json<AiActionResponse<SmartPasteCharactersResult>>(
      "POST",
      "/ai/smart-paste-characters",
      undefined,
      body,
    );
  }
  /** Pasted text -> its main plot and named subplots. */
  smartPastePlots(body: SmartPastePlotsRequest) {
    return this.json<AiActionResponse<SmartPastePlotsResult>>(
      "POST",
      "/ai/smart-paste-plots",
      undefined,
      body,
    );
  }
  /** Pasted text -> the same words formatted as scenes and typed elements. Can take a few minutes. */
  smartPasteScript(body: SmartPasteScriptRequest) {
    return this.json<AiActionResponse<SmartPasteScriptResult>>(
      "POST",
      "/ai/smart-paste-script",
      undefined,
      body,
    );
  }
  /** Which scenes have a summary that can stand in for them when one scene is reviewed on its own. */
  listSceneSummaries(documentId: string) {
    return this.json<SceneSummariesResponse>(
      "GET",
      `/documents/${encodeURIComponent(documentId)}/ai/scene-summaries`,
    );
  }
  /** A review note + the scene it is about -> up to three alternative fixes, each a set of element edits to apply. */
  suggestNoteFix(body: SuggestNoteFixRequest) {
    return this.json<AiActionResponse<SuggestNoteFixResult>>(
      "POST",
      "/ai/suggest-note-fix",
      undefined,
      body,
    );
  }

  selectedEntityId(): string | undefined {
    return this.opts.getSelectedEntityId?.() ?? undefined;
  }
  getCreditsBalance(entityId?: string) {
    return this.json<ConsumableBalanceResponse>(
      "GET",
      "/consumables/balance",
      entityId ? { entityId } : undefined,
    );
  }
  listCreditPurchases(
    query: { limit?: number; offset?: number; entityId?: string } = {},
  ) {
    return this.json<ConsumablePurchaseRecord[]>(
      "GET",
      "/consumables/purchases",
      query as Query,
    );
  }
  listCreditUsages(
    query: { limit?: number; offset?: number; entityId?: string } = {},
  ) {
    return this.json<ConsumableUsageRecord[]>(
      "GET",
      "/consumables/usages",
      query as Query,
    );
  }
  setCreditPurchaseTarget(entityId: string) {
    return this.json<{ ok: boolean }>(
      "POST",
      "/consumables/purchase-target",
      undefined,
      { entityId },
    );
  }
  redeemCreditCoupon(code: string, entityId?: string) {
    return this.json<CreditCouponRedeemResponse>(
      "POST",
      "/consumables/redeem-coupon",
      undefined,
      { code, ...(entityId ? { entityId } : {}) },
    );
  }
  listCreditCoupons() {
    return this.json<CreditCoupon[]>("GET", "/consumables/coupons/history");
  }
  createCreditCoupon(body: CreditCouponCreateRequest) {
    return this.json<CreditCoupon>(
      "POST",
      "/consumables/coupons",
      undefined,
      body,
    );
  }
  /** Public: works signed out (a pricing/signup page). */
  listCreditProducts() {
    return this.json<CreditProduct[]>(
      "GET",
      "/consumables/products",
      undefined,
      undefined,
      "none",
    );
  }
  /** Lets a platform with no in-app purchase (Windows) send the user to a web purchase page already signed in. */
  createPurchaseHandoff(body: PurchaseHandoffRequest) {
    return this.json<PurchaseHandoffResponse>(
      "POST",
      "/purchases/handoff",
      undefined,
      body,
    );
  }

  // ─── B12 collaboration, notifications, devices, email ────────────────────

  getNotificationPrefs() {
    return this.json<NotificationPrefs>("GET", "/me/notification-prefs");
  }
  setNotificationPrefs(update: NotificationPrefsUpdate) {
    return this.json<NotificationPrefs>(
      "PUT",
      "/me/notification-prefs",
      undefined,
      update,
    );
  }
  /** Reads `X-Unread-Count` (spec 05 §6.16), so the badge count is one call, not a second query. */
  async listNotifications(
    query: Partial<NotificationsQuery> = {},
  ): Promise<Paginated<Notification> & { unreadCount: number }> {
    const res = await this.send("GET", "/notifications", query as Query);
    if (res.status < 200 || res.status >= 300) this.fail(res);
    const env = JSON.parse(new TextDecoder().decode(res.body)) as {
      success: true;
      data: Paginated<Notification>;
    };
    return {
      ...env.data,
      unreadCount: Number(res.headers["x-unread-count"] ?? 0),
    };
  }
  markNotificationsRead(body: NotificationsReadRequest) {
    return this.json<NotificationsReadResponse>(
      "POST",
      "/notifications/read",
      undefined,
      body,
    );
  }
  deleteNotification(nid: string) {
    return this.json<NotificationDeleteResponse>(
      "DELETE",
      `/notifications/${enc(nid)}`,
    );
  }
  /**
   * `EventSource` cannot send an `Authorization` header, so this reads the SSE response body as a raw fetch stream:
   * events `notification` / `unread_count` (plus a `heartbeat` every 25 s to keep the connection alive across
   * proxies). Reconnects with full-jitter backoff (`sync/backoff.ts`) on any drop; `close()` stops it for good.
   */
  openNotificationStream(
    onEvent: (evt: NotificationStreamEvent) => void,
    opts: NotificationStreamOptions = {},
  ): NotificationStreamHandle {
    const fetchImpl =
      opts.fetchImpl ??
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
    let stopped = false;
    let attempt = 0;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const parseChunk = (chunk: string) => {
      let event = "message";
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) return;
      const raw = dataLines.join("\n");
      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        /* keep the raw string */
      }
      onEvent({ event: event as NotificationStreamEvent["event"], data });
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      opts.onStatus?.("closed");
      const delay = backoffDelay(attempt++, opts.random);
      retryTimer = setTimeout(() => void connect(), delay);
    };

    const connect = async () => {
      if (stopped) return;
      controller = new AbortController();
      opts.onStatus?.("connecting");
      try {
        const token = await this.opts.getToken();
        const headers: Record<string, string> = { Accept: "text/event-stream" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetchImpl(this.url("/notifications/stream"), {
          headers,
          signal: controller.signal,
        });
        if (!res.ok || !res.body)
          throw new Error(`notification stream HTTP ${res.status}`);
        opts.onStatus?.("open");
        attempt = 0;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            parseChunk(buf.slice(0, idx));
            buf = buf.slice(idx + 2);
          }
        }
      } catch {
        // network error, abort, or a non-OK/streaming response: fall through to reconnect unless stopped
      } finally {
        scheduleReconnect();
      }
    };

    void connect();
    return {
      close() {
        stopped = true;
        controller?.abort();
        if (retryTimer) clearTimeout(retryTimer);
      },
    };
  }

  listMentionsWithoutAccess(did: string) {
    return this.json<MentionWithoutAccess[]>(
      "GET",
      `/documents/${enc(did)}/mentions-without-access`,
    );
  }
  listChat(did: string, query: Partial<ChatQuery> = {}) {
    return this.json<Paginated<ChatMessage>>(
      "GET",
      `/documents/${enc(did)}/chat`,
      query as Query,
    );
  }
  /** `clientMessageId` defaults to a fresh `msg_...` id (idempotent: a retried send is safe). */
  sendChatMessage(
    did: string,
    body: Omit<ChatMessageCreateRequest, "clientMessageId"> & {
      clientMessageId?: string;
    },
  ) {
    const clientMessageId = body.clientMessageId ?? newChatMessageId();
    return this.json<ChatMessage>(
      "POST",
      `/documents/${enc(did)}/chat`,
      undefined,
      { ...body, clientMessageId },
    );
  }
  editChatMessage(mid: string, body: ChatMessageUpdateRequest) {
    return this.json<ChatMessage>(
      "PATCH",
      `/chat-messages/${enc(mid)}`,
      undefined,
      body,
    );
  }
  deleteChatMessage(mid: string) {
    return this.json<ChatMessageDeleteResponse>(
      "DELETE",
      `/chat-messages/${enc(mid)}`,
    );
  }
  listDocumentActivity(did: string, query: Partial<ActivityQuery> = {}) {
    const { kinds, ...rest } = query;
    return this.json<Paginated<ActivityEvent>>(
      "GET",
      `/documents/${enc(did)}/activity`,
      { ...rest, kinds: kinds?.join(",") },
    );
  }
  listWorkspaceActivity(
    wid: string,
    query: Partial<WorkspaceActivityQuery> = {},
  ) {
    return this.json<Paginated<WorkspaceActivityEvent>>(
      "GET",
      `/entities/${enc(wid)}/activity`,
      query as Query,
    );
  }
  /** `currentDeviceId` marks that one `current: true` in the result (not a spec query param, but harmless: the caller already knows its own device id). */
  listDevices(currentDeviceId?: string) {
    return this.json<Device[]>(
      "GET",
      "/devices",
      currentDeviceId ? { deviceId: currentDeviceId } : undefined,
    );
  }
  registerDevice(body: DeviceCreateRequest) {
    return this.json<DeviceCreateResponse>("POST", "/devices", undefined, body);
  }
  updateDevice(devid: string, body: DeviceUpdateRequest) {
    return this.json<Device>(
      "PATCH",
      `/devices/${enc(devid)}`,
      undefined,
      body,
    );
  }
  revokeDevice(devid: string) {
    return this.json<DeviceRevokeResponse>(
      "POST",
      `/devices/${enc(devid)}/revoke`,
    );
  }
  setPushToken(devid: string, body: PushTokenSetRequest) {
    return this.json<PushTokenSetResponse>(
      "PUT",
      `/devices/${enc(devid)}/push-token`,
      undefined,
      body,
    );
  }
  clearPushToken(devid: string) {
    return this.json<PushTokenDeleteResponse>(
      "DELETE",
      `/devices/${enc(devid)}/push-token`,
    );
  }

  // ─── B18 public, admin, telemetry ─────────────────────────────────────────

  /** No auth: works signed out. */
  listPublicTemplates(category?: string) {
    return this.json<TemplateSummary[]>(
      "GET",
      "/public/templates",
      { category },
      undefined,
      "none",
    );
  }
  getPublicTemplate(builtinKey: string) {
    return this.json<TemplateJSON>(
      "GET",
      `/public/templates/${enc(builtinKey)}`,
      undefined,
      undefined,
      "none",
    );
  }
  /** The single client-policy route (R31): raises `ClientOutdatedError` itself only via the normal error path (a
   *  426 response to THIS call would be unusual — clients read `minClientVersion` from the body to decide, before
   *  they are the ones being gated on a later call). */
  getPublicConfig() {
    return this.json<PublicConfig>(
      "GET",
      "/public/config",
      undefined,
      undefined,
      "none",
    );
  }
  getNamesDb(version: number) {
    return this.json<NamesDbResponse>(
      "GET",
      `/public/names-db/${version}`,
      undefined,
      undefined,
      "none",
    );
  }
  getDeepHealth() {
    return this.json<DeepHealthResponse>(
      "GET",
      "/public/health/deep",
      undefined,
      undefined,
      "none",
    );
  }
  getWatermarkedDownload(exportId: string, token: string) {
    return this.json<WatermarkedDownloadInfo>(
      "GET",
      `/public/watermarked/${enc(exportId)}/${enc(token)}`,
      undefined,
      undefined,
      "none",
    );
  }
  redeemPurchaseHandoff(body: PurchaseHandoffRedeemRequest) {
    return this.json<PurchaseHandoffRedeemResponse>(
      "POST",
      "/public/purchases/handoff/redeem",
      undefined,
      body,
      "none",
    );
  }
  /** `U,P`: sends the bearer so the server can attribute the report when the caller is signed in; the route accepts
   *  anonymous too. Never throws — telemetry must not itself break the app (a failed `getToken()` for a signed-out
   *  visitor, or a network error, both just mean nothing was recorded). */
  async sendTelemetry(body: TelemetryRequest): Promise<TelemetryResponse> {
    try {
      return await this.json<TelemetryResponse>(
        "POST",
        "/telemetry",
        undefined,
        body,
        "user",
      );
    } catch {
      return { accepted: false };
    }
  }

  /** Admin (spec 05 §6.23): `siteAdmin` on a user principal only. Used only by an admin page. */
  adminLookupUser(email: string) {
    return this.json<AdminUserLookup>("GET", "/admin/users", { email });
  }
  adminRestoreUser(uid: string) {
    return this.json<AdminUserRestoreResponse>(
      "POST",
      `/admin/users/${enc(uid)}/restore`,
    );
  }
  adminPurgeUser(uid: string) {
    return this.json<AdminUserPurgeResponse>(
      "DELETE",
      `/admin/users/${enc(uid)}`,
    );
  }
  adminListJobs(query: AdminJobListQuery = {}) {
    return this.json<Paginated<Job>>("GET", "/admin/jobs", query as Query);
  }
  adminRetryJob(jobId: string) {
    return this.json<Job>("POST", `/admin/jobs/${enc(jobId)}/retry`);
  }
  adminRefundJob(jobId: string, body: AdminJobRefundRequest = {}) {
    return this.json<AdminJobRefundResponse>(
      "POST",
      `/admin/jobs/${enc(jobId)}/refund`,
      undefined,
      body,
    );
  }
  adminUpdateJobKind(kind: string, patch: AdminJobKindPatchRequest) {
    return this.json<AdminJobKind>(
      "PATCH",
      `/admin/job-kinds/${enc(kind)}`,
      undefined,
      patch,
    );
  }
  adminGetDocumentMeta(did: string) {
    return this.json<AdminDocumentMeta>(
      "GET",
      `/admin/documents/${enc(did)}/meta`,
    );
  }
}

/** One SSE event from `openNotificationStream`. */
export interface NotificationStreamEvent {
  event: "notification" | "unread_count" | "heartbeat" | string;
  data: unknown;
}
export interface NotificationStreamOptions {
  onStatus?: (status: "connecting" | "open" | "closed") => void;
  /** Test seam: a fake `fetch` returning a streamed `Response`. */
  fetchImpl?: typeof fetch;
  /** Test seam for the reconnect backoff. */
  random?: () => number;
}
export interface NotificationStreamHandle {
  close(): void;
}

/** A fresh `clientMessageId` for `sendChatMessage` (`msg_` + 32 hex-ish chars). */
export function newChatMessageId(): string {
  return `msg_${newIdempotencyKey()
    .replace(/[^A-Za-z0-9]/g, "")
    .padEnd(32, "0")
    .slice(0, 32)}`;
}

/**
 * Which client method serves each `API_ROUTES` entry. Typed as a full record, so adding a route to
 * `screenwriter_types` is a compile error here until it is mapped. `null` = the API does not serve it yet.
 */
export const API_ROUTE_METHODS: Record<
  ApiRouteName,
  keyof ScreenwriterClient | null
> = {
  health: "health",
  meGet: "me",
  mePatch: "updateMe",
  entitiesList: "listManagedEntities",
  entityGetDetails: "getEntityDetails",
  projectsList: "listProjects",
  projectCreate: "createProject",
  projectGet: "getProject",
  projectUpdate: "updateProject",
  projectTrash: "trashProject",
  projectRestore: "restoreProject",
  documentsList: "listDocuments",
  documentCreate: "createDocument",
  documentGet: "getDocument",
  documentUpdate: "updateDocument",
  documentTrash: "trashDocument",
  documentRestore: "restoreDocument",
  documentState: "getDocumentState",
  documentContent: "getDocumentContent",
  documentImport: "importDocument",
  documentExport: "exportDocument",
  formatsList: "getFormats",
  templatesList: "listTemplates",
  templateGet: "getTemplate",
  sync: "syncUrl",
  versionsList: "listVersions",
  versionState: "getVersionState",
  versionRestore: "restoreVersion",
  versionSnapshot: "snapshotVersion",
  snapshotsList: "listSnapshots",
  snapshotCreate: "createSnapshot",
  snapshotGet: "getSnapshot",
  snapshotState: "getSnapshotState",
  snapshotContent: "getSnapshotContent",
  snapshotOpen: "openSnapshot",
  snapshotFork: "forkSnapshot",
  elementHistory: "getElementHistory",
  documentPresence: "getPresence",
  versionRestoreAsCopy: "restoreVersionAsCopy",
  snapshotPrefs: "setSnapshotPrefs",
  snapshotNotesList: "listSnapshotNotes",
  snapshotNoteCreate: "addSnapshotNote",
  snapshotCommentsList: "listSnapshotComments",
  snapshotCommentCreate: "addSnapshotComment",
  snapshotCommentCopyToLive: "copyCommentToLive",
  snapshotCommentResolve: "resolveSnapshotComment",
  documentCompare: "compare",
  // B5 commands and live scene reads
  commands: "applyCommands",
  outline: "getOutline",
  scene: "getScene",
  scenesBatch: "getScenes",
  elementsBatch: "getElements",
  // B6 personal API keys
  apiKeysList: "listApiKeys",
  apiKeyCreate: "createApiKey",
  apiKeyUpdate: "updateApiKey",
  apiKeyRevoke: "revokeApiKey",
  // B7 AI
  aiStatus: "getAiStatus",
  aiGenerateCharacterSkeleton: "generateCharacterSkeleton",
  aiGenerateScript: "generateScript",
  aiPolishCharacterDialogue: "polishCharacterDialogue",
  aiPolishScene: "polishScene",
  aiSmartPasteCharacters: "smartPasteCharacters",
  aiSmartPastePlots: "smartPastePlots",
  aiSmartPasteScript: "smartPasteScript",
  aiSuggestNoteFix: "suggestNoteFix",
  aiJobCreate: "startAiJob",
  aiJobsList: "listAiJobs",
  aiSceneSummaries: "listSceneSummaries",
  aiJobGet: "getAiJob",
  aiJobCancel: "cancelAiJob",
  aiSuggestionSetsList: "listSuggestionSets",
  aiSuggestionSetGet: "getSuggestionSet",
  aiSuggestionSetAccept: "acceptSuggestions",
  aiSuggestionSetReject: "rejectSuggestions",
  // B9 generic jobs
  jobsList: "listJobs",
  jobGet: "getJob",
  jobCreate: "createJob",
  jobCancel: "cancelJob",
  jobOutputs: "getJobOutputs",
  jobRecipients: "listJobRecipients",
  jobWebhook: null, // provider-to-server call (HMAC): a client never makes it
  // B10 projection reads, search, reports, packets
  documentEntitiesList: "listEntities",
  entityGet: "getEntity",
  entityUsage: "getEntityUsage",
  entityDialogue: "getEntityDialogue",
  tagCategoriesList: "listTagCategories",
  tagsList: "listTags",
  notesList: "listNotes",
  beatsList: "listBeats",
  binList: "getBin",
  revisionsGet: "listRevisions",
  changesList: "listChanges",
  alternatesGet: "getAlternates",
  titlePageGet: "getTitlePage",
  statsGet: "getStats",
  fountainGet: "getFountain",
  sceneShotsList: "listSceneShots",
  resolveBatch: "resolveLocators",
  resolveOne: "resolveLocator",
  documentSearch: "searchDocument",
  workspaceSearch: "searchWorkspace",
  search: "search",
  reportKinds: "getReportKinds",
  reportGet: "getReport",
  reportCreate: "createReport",
  packetScene: "getScenePacket",
  packetCharacter: "getCharacterPacket",
  packetLocation: "getLocationPacket",
  packetShot: "getShotPacket",
  // B8 tenancy, roles, sharing
  entityCreate: "createManagedEntity",
  entityUpdate: "updateManagedEntity",
  entityDelete: "deleteManagedEntity",
  entityTransfer: "transferManagedEntity",
  entityLeave: "leaveManagedEntity",
  managedEntityUsage: "getManagedEntityUsage",
  entityAudit: "downloadEntityAudit",
  membersList: "listMembers",
  memberUpdate: "updateMemberRole",
  memberRemove: "removeMember",
  invitationCreateEntity: "inviteToEntity",
  invitationCreateProject: "inviteToProject",
  invitationCreateDocument: "inviteToDocument",
  entityInvitationsList: "listEntityInvitations",
  myInvitations: "listMyInvitations",
  invitationRenew: "renewInvitation",
  invitationCancel: "cancelInvitation",
  invitationAccept: "acceptInvitation",
  invitationAcceptById: "acceptMyInvitation",
  invitationDecline: "declineInvitation",
  sharedWithMe: "listSharedWithMe",
  documentLock: "lockDocument",
  documentUnlock: "unlockDocument",
  documentUnlockSession: "createUnlockSession",
  shareLinkCreateDocument: "createDocumentShareLink",
  shareLinkCreateProject: "createProjectShareLink",
  shareLinkCreateSnapshot: "createSnapshotShareLink",
  shareLinksListDocument: "listDocumentShareLinks",
  shareLinksListProject: "listProjectShareLinks",
  shareLinkUpdate: "updateShareLink",
  shareLinkRevoke: "revokeShareLink",
  grantsListDocument: "listDocumentGrants",
  grantsListProject: "listProjectGrants",
  grantUpdate: "updateGrant",
  grantRemove: "removeGrant",
  publicShareResolve: "resolveShareLink",
  shareUnlock: "unlockShareLink",
  shareState: "getSharedState",
  // B13 account and per-user data
  meDictionaryGet: "getDictionary",
  meDictionaryUpdate: "updateDictionary",
  mePreferencesGet: "getPreferences",
  mePreferencesSet: "setPreferences",
  meMacrosList: "listMacros",
  meMacroCreate: "createMacro",
  meMacroUpdate: "updateMacro",
  meMacroDelete: "deleteMacro",
  meWritingStats: "getWritingStats",
  meWritingSessionCreate: "recordWritingSession",
  meWritingGoalsGet: "getWritingGoals",
  meWritingGoalsSet: "setWritingGoals",
  meExport: "requestAccountExport",
  meDelete: "deleteAccount",
  meRestore: "restoreAccount",
  documentMyStateGet: "getMyDocumentState",
  documentMyStateSet: "setMyDocumentState",
  documentStar: "starDocument",
  documentUnstar: "unstarDocument",
  // B14 project, document and template lifecycle, workspace settings
  workspaceDocuments: "listWorkspaceDocuments",
  workspaceTrash: "listTrash",
  workspaceTrashEmpty: "emptyTrash",
  projectPurge: "deleteProject",
  projectDuplicate: "duplicateProject",
  projectFolderCreate: "createFolder",
  projectFolderUpdate: "updateFolder",
  projectFolderDelete: "deleteFolder",
  documentMove: "moveDocument",
  documentPurge: "purgeDocument",
  documentDuplicate: "duplicateDocument",
  documentApplyTemplate: "applyTemplate",
  templateCreate: "createTemplate",
  templateVersionCreate: "createTemplateVersion",
  templateUpdate: "updateTemplate",
  templateDelete: "deleteTemplate",
  templateImport: "importTemplate",
  templateExport: "exportTemplate",
  projectBinList: "listProjectBin",
  projectBinCreate: "addToProjectBin",
  projectBinDelete: "removeFromProjectBin",
  workspaceDefaultsGet: "getWorkspaceDefaults",
  workspaceDefaultsSet: "setWorkspaceDefaults",
  workspaceContactsList: "listContacts",
  workspaceContactsCreate: "createContacts",
  workspaceContactUpdate: "updateContact",
  workspaceContactDelete: "deleteContact",
  // B16 imports, exports and watermark as jobs
  uploadState: "uploadState",
  importCreate: "createImportJob",
  importStart: "startImport",
  documentImportOver: "importOver",
  documentExportCreate: "createExportJob",
  documentExportCombined: "exportCombined",
  watermarkLookup: "lookupWatermark",
  // B11 assets and R2
  assetUploadCreate: "initAssetUpload",
  assetUploadGet: "getAssetUpload",
  assetUploadParts: "signAssetUploadParts",
  assetUploadComplete: "completeAssetUpload",
  assetUploadAbort: "abortAssetUpload",
  assetsList: "listAssets",
  assetGet: "getAsset",
  assetUrl: "getAssetUrl",
  assetUpdate: "updateAsset",
  assetDelete: "deleteAsset",
  assetRestore: "restoreAsset",
  assetLinkCreate: "createAssetLink",
  documentAssetLinks: "listDocumentAssetLinks",
  assetLinkUpdate: "updateAssetLink",
  assetLinkDelete: "unlinkAsset",
  documentStaleness: "getDocumentStaleness",
  assetLinkStaleness: "getAssetLinkStaleness",
  // B12 collaboration, notifications, devices, email
  meNotificationPrefsGet: "getNotificationPrefs",
  meNotificationPrefsSet: "setNotificationPrefs",
  documentMentionsWithoutAccess: "listMentionsWithoutAccess",
  documentChatList: "listChat",
  documentChatCreate: "sendChatMessage",
  chatMessageUpdate: "editChatMessage",
  chatMessageDelete: "deleteChatMessage",
  documentActivity: "listDocumentActivity",
  workspaceActivity: "listWorkspaceActivity",
  notificationsList: "listNotifications",
  notificationsRead: "markNotificationsRead",
  notificationDelete: "deleteNotification",
  notificationsStream: "openNotificationStream",
  devicesList: "listDevices",
  deviceCreate: "registerDevice",
  deviceUpdate: "updateDevice",
  deviceRevoke: "revokeDevice",
  devicePushTokenSet: "setPushToken",
  devicePushTokenDelete: "clearPushToken",
  meAiConsentGet: "getAiConsent",
  meAiConsentAccept: "acceptAiConsent",
  meAiActivity: "listMyAiActivity",
  workspaceAiActivity: "listWorkspaceAiActivity",
  aiEstimate: "estimateAiJob",
  aiReportsList: "listAiReports",
  aiReportGet: "getAiReport",
  aiReportNoteConvert: "convertAiNote",
  aiSuggestionSetDecide: "decideSuggestions",
  consumablesBalance: "getCreditsBalance",
  consumablesPurchaseTarget: "setCreditPurchaseTarget",
  consumablesRedeemCoupon: "redeemCreditCoupon",
  consumablesCouponsList: "listCreditCoupons",
  consumablesCouponsCreate: "createCreditCoupon",
  consumablesPurchases: "listCreditPurchases",
  consumablesUsages: "listCreditUsages",
  consumablesProducts: "listCreditProducts",
  consumablesWebhook: null, // provider-called, no client method
  purchaseHandoffCreate: "createPurchaseHandoff",
  publicTemplatesList: "listPublicTemplates",
  publicTemplateGet: "getPublicTemplate",
  publicConfig: "getPublicConfig",
  publicNamesDb: "getNamesDb",
  publicHealthDeep: "getDeepHealth",
  publicWatermarkedGet: "getWatermarkedDownload",
  purchaseHandoffRedeem: "redeemPurchaseHandoff",
  telemetryCreate: "sendTelemetry",
  adminUsersLookup: "adminLookupUser",
  adminUserRestore: "adminRestoreUser",
  adminUserPurge: "adminPurgeUser",
  adminJobsList: "adminListJobs",
  adminJobRetry: "adminRetryJob",
  adminJobRefund: "adminRefundJob",
  adminJobKindUpdate: "adminUpdateJobKind",
  adminDocumentMeta: "adminGetDocumentMeta",
};
