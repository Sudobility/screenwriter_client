# screenwriter_client

`@sudobility/screenwriter_client`: the frontend network client for the ViaInk screenwriting app (backend `../screenwriter_api`). Typed REST client over an injected `NetworkClient`, `@tanstack/react-query` hooks, and a framework-free Yjs sync client. Slice F1 of the frontend MVP; `../screenwriter_lib` (F2) consumes it.

## Tech stack

Bun, TypeScript 6 (ESM, `moduleResolution: bundler`, `verbatimModuleSyntax`), Vite 8 (library build), Vitest 4, Yjs (V2 encoding). `@tanstack/react-query` v5 and `react` are peer deps; `yjs`, `@sudobility/screenwriter_types`, `@sudobility/writing_core` are direct deps. **Platform-free**: only global `fetch`/`WebSocket`, no Node built-ins in `src/` (tests may use `node:*`).

## Commands

- `bun install`
- `bun run typecheck` — `tsc --noEmit`
- `bun run test:unit` — hermetic Vitest (fake network); this is what CI runs. **Never `bun test`** (that invokes Bun's runner, not Vitest).
- `bun run test:integration` — **local-dev only**, excluded from CI. Spawns the real `../screenwriter_api` as a child process on a random port (`AI_TEST_MODE=1`) against local Postgres `screenwriter_test` (`DATABASE_URL=postgres://localhost:5432/screenwriter_test`). Needs the api sibling checked out and Postgres running.
- `bun run build` — Vite library build → single `dist/index.js` (ES), then `tsc -p tsconfig.build.json` for `.d.ts`, then `node scripts/fix-esm-imports.mjs`.
- `bun run clean` — `rimraf dist`.

No lint script exists.

## Publishing & CI

Published to **GitHub Packages** (`@sudobility` → `npm.pkg.github.com`, see `.npmrc`), version `0.1.21`. `.github/workflows/ci-cd.yml` delegates to the shared `johnqh/workflows` unified-cicd reusable workflow (`publish-target: github`) on push/PR to `main`/`develop`; CI runs `test:unit` and publishes on push to a release branch. (Earlier docs called this a non-published local package — that is stale.)

## Structure

```
src/
  index.ts    barrel
  errors/     ApiError (code, status, details) + typed subclasses + is* guards + apiErrorFrom
  network/    NetworkClient interface + createFetchNetworkClient (the ONLY fetch call);
              screenwriter-client.ts (one method per route) + API_ROUTE_METHODS (route->method map);
              retry.ts (retry policy, gzip, idempotency keys)
  hooks/      query-keys.ts (central factory), query-config.ts, client-context.ts (Provider + useScreenwriterClient),
              one use-*.ts file per resource group (account, projects, documents, scenes, templates, trash,
              versions, snapshots, sharing, jobs, ai, credits, assets, import-export, reads, search, reports,
              packets, notifications, chat, activity, devices, public, admin, ...)
  sync/       sync-client.ts (framework-free), awareness.ts (own JSON relay), backoff.ts
  util/       base64.ts (btoa/atob, no Buffer), sha256.ts (Web Crypto)
tests/        *.test.tsx/ts hermetic (fake network); *-integration.test.ts + integration.test.ts spawn the real API
```

## Build pipeline (non-obvious)

- Vite builds library mode to one ES `dist/index.js`; `tsconfig.build.json` emits `.d.ts` separately with empty `paths: {}` so declarations resolve against the real npm deps, not local sibling source.
- `scripts/fix-esm-imports.mjs` rewrites `tsc`'s extensionless/`.ts` relative specifiers to fully-qualified `.js` paths so Node's ESM loader accepts the output. Idempotent, never fails the build.
- `yjs`, `react`, `@tanstack/react-query`, and the two sibling packages are kept **external** in the Vite build.

## Single Yjs (critical)

`yjs`/`lib0` MUST resolve to one instance at runtime — a second instance breaks `Y.Doc` interop. Locally, `tsconfig.json` `paths` and the Vitest aliases in `vitest.shared.ts` point `yjs`/`lib0` (and `@sudobility/screenwriter_types`/`@sudobility/writing_core`) at `../writing_core/node_modules` / sibling source. The two must stay in sync. Each alias applies only when that sibling repo is checked out; otherwise it falls through to the installed npm dep (CI resolves `yjs` transitively via `writing_core` — still one copy). Same recipe as `screenwriter_api`.

## Core conventions

- **DI**: `new ScreenwriterClient({ network, baseUrl, getToken, clientTag?, retry? })`. `baseUrl` is the origin (no `/api/v1`). `getToken(forceRefresh)` is retried once with `true` after a 401. The response envelope's `data` is unwrapped; failures throw `ApiError` whose `code` is an API error code or `NETWORK_ERROR`/`BAD_RESPONSE`.
- **Route-contract parity**: `API_ROUTE_METHODS` is `Record<ApiRouteName, method | null>`. A new route in `screenwriter_types` fails typecheck until mapped; `tests/contract.test.ts` requires full parity (only `jobWebhook`, an HMAC server-to-server route, may be `null`) and unique method names. Add the method, its hook, and its query key in the same change as a new route.
- **Request funnel** (`send` + `network/retry.ts`): builds headers (token, `X-Client` from `clientTag`, `X-Doc-Unlock`); adds an `Idempotency-Key` (one UUID per logical call, reused across retries) on every POST except `/export`, `/documents/import`, `/(elements|scenes)/batch`, and share-unlock; gzips JSON bodies ≥1 KiB when `CompressionStream` exists; refreshes the token once on 401; then applies the retry policy (3 attempts, base 400 ms, cap 8 s, full jitter, `Retry-After` honored; GET/PUT/DELETE always, POST only with a key, PATCH never; `QUOTA_EXCEEDED`/4xx never). React Query's own retry stays off — retry lives here.
- **Hooks** read the client from `<ScreenwriterClientProvider client>` inside a `QueryClientProvider`. Keys come from `queryKeys`; mutations invalidate affected families (create project → project lists; restore version / open snapshot / `applyCommands` → `documentFamily(did)`). Reads take a `source` (`live` | `snapshot:<id>` | `version:<id>`) where applicable.
- **Merge-top-level writes** (`setPreferences`, `setMyDocumentState`, `setWorkspaceDefaults`): send only the top-level keys to change (`null` removes one), merged onto the server copy (or a passed `base`), PUT with `baseUpdatedAt`, with one merge-and-retry on 409 `STALE_WRITE` before `StaleWriteError` reaches the caller.
- **Binary state**: `getDocumentState`/`getSnapshotState`/`getVersionState` return `{ state: Uint8Array (Yjs V2), epoch, stateVector }`.
- **Typed errors** (`apiErrorFrom` in `errors/`): many routes throw dedicated subclasses carrying structured `details` (e.g. `RoleInsufficientError`, `ShareLinkExpiredError`, `RateLimitedError`, `PayloadTooLargeError`, `StaleWriteError`, `LocatorAmbiguousError`, `UnmappedStylesError`, `AssetUploadInterruptedError` — the last is **not** an `ApiError`). Codes without extra details (e.g. `FOLDER_DEPTH`, `MOVE_FORBIDDEN`, `EDIT_WINDOW_CLOSED`, `ID_CONFLICT`) stay a plain `ApiError` — check `.code`. Use the `is*` guards.

## SyncClient (non-obvious)

- Yjs frames are **V2**. Remote updates apply with an internal origin; only non-remote-origin doc updates are sent. Use `encodeFrame`/`decodeFrame` from `screenwriter_types` — do not write another codec.
- **Awareness is our own UTF-8 JSON relay** (`{clientId, state}`, server relays opaque bytes). **Do not import `y-protocols`.** The server does not replay awareness on subscribe — the client re-introduces itself to each newly seen peer. Remote peers expire after `awarenessTimeoutMs` (30 s); local state re-broadcasts at half that.
- **Epoch changes are reported, not handled.** `epochChanged`, `subscribeError EPOCH_MISMATCH`, `reject EPOCH_MISMATCH`, and close 4409 mark the document `stale` and emit `epochChanged({documentId, liveEpoch})` once. The caller rebases by calling `subscribe` again with a fresh `Y.Doc` and the new epoch.
- **The WebSocket subprotocol is deliberately NOT offered**: the API does not echo `fadewright-sync.v1`, and browsers fail a socket whose offered protocol is not selected.
- Close codes: 4401 refresh token once then stop; 4403/4406 stop (`stopped`); 4400 ×3 in 10 min stop; 4429 backs off ≥5 s; 1001 honors `serverShutdown.reconnectAfterMs`; else full-jitter exponential backoff (attempt resets after a 60 s healthy connection). `online` triggers an immediate reconnect.
- Events via `on(event, fn)`: `status`, `docStatus`, `epochChanged`, `authError`, `subscribeError`, `rejected`, `roleChanged`, `documentDeleted`, `stopped`, `closed`, `error`.
- Link sessions: `scheme: "link"` (`getToken` returns a `linkSession`, re-sent every 10 min). Pass `getUnlockToken` for a locked document (one token per connection).
- `openNotificationStream` (in the REST client) also bypasses `NetworkClient` on purpose: `EventSource` can't send `Authorization`, so it uses `fetch` + a reader to parse SSE, reconnecting via `sync/backoff.ts`.

## Notes / gotchas

- `@sudobility/consumables_client` is intentionally **not** wired in (incompatible `NetworkClient` shape and purchase flow); credits/AI call the real routes directly here.
- `/language/*` was never built (deliberate) — no `checkLanguage`/`listLanguages` methods.
- `ClientOutdatedError` (426 `CLIENT_TOO_OLD`) exists, but this client does not yet send `X-Client-Version`/`X-Client-Platform`, so it can't be gated by its own calls until something sets them.
- Integration tests read invitation tokens from the API's dev outbox (`INVITATION_OUTBOX_FILE`) and clean up through the API's `postgres`.

## Related

`../screenwriter_types` (shared types + codec), `../screenwriter_api` (server), `../writing_core` (Yjs/editor core, owns the single yjs install), `../screenwriter_lib` (F2 consumer), `../sudojo_client` (convention reference).
