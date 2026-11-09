# @sudobility/screenwriter_client

Network client for the ViaInk screenwriting app (served by `screenwriter_api`): a typed REST wrapper over an injected `NetworkClient`, a set of `@tanstack/react-query` hooks, and a framework-free Yjs sync client for the realtime WebSocket.

Published to GitHub Packages as `@sudobility/screenwriter_client` (scope registry configured in `.npmrc`). The package is platform-free — it uses only the global `fetch` and `WebSocket`, with no Node built-ins in `src/`, so it runs in browsers, React Native and Node 22+.

## Install

The `@sudobility` scope resolves to GitHub Packages, so consumers need a `.npmrc` with that registry and a token that can read the scope:

```
@sudobility:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_READ_TOKEN}
```

```bash
bun add @sudobility/screenwriter_client
# peers you must also install in the consuming app:
bun add react @tanstack/react-query
```

`react` (>=18) and `@tanstack/react-query` (>=5) are peer dependencies; `yjs`, `@sudobility/screenwriter_types` and `@sudobility/writing_core` come in as regular dependencies. See [Single Yjs](#single-yjs) before wiring Yjs in a consuming app.

## Usage

```ts
import * as Y from "yjs";
import { createFetchNetworkClient, ScreenwriterClient, SyncClient } from "@sudobility/screenwriter_client";

const getToken = async () => "dev:u1:a@b.co"; // Firebase ID token in production
const api = new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: "http://localhost:8036", getToken });

const me = await api.me();
const project = await api.createProject(me.personalWorkspaceId, { name: "My film" });
const doc = await api.createDocument(project.id, { title: "Pilot", kind: "script" });

const sync = new SyncClient({ url: api.syncUrl(), getToken });
const ydoc = new Y.Doc();
const sub = sync.subscribe(doc.id, ydoc, { epoch: doc.epoch });
sync.on("epochChanged", ({ documentId, liveEpoch }) => { /* rebase: resubscribe with a fresh doc */ });
sub.setLocalAwareness({ name: "Ann" });
```

React: wrap in `QueryClientProvider` and `<ScreenwriterClientProvider client={api}>`, then use `useProjects`, `useCreateProject`, `useDocument`, `useSnapshots`, ... (one hook file per resource group under `src/hooks/`).

## What's exported

- **`ScreenwriterClient`** — one method per served `screenwriter_api` route (me, workspaces, projects, documents incl. `getDocumentState` bytes, templates, versions, snapshots, sharing, jobs, imports/exports, assets, AI, credits, reads, search, reports, admin, ...). Unwraps the response envelope's `data`; failures throw `ApiError` (or a typed subclass).
- **Hooks** — a `use*` query/mutation hook for each method, plus a central `queryKeys` factory. Mutations invalidate the affected query families.
- **`SyncClient`** — `connect`, `subscribe`, `unsubscribe`, `disconnect`, `on(event, fn)`, awareness relay, reconnect with backoff, and epoch-change reporting.
- **Errors** — `ApiError` plus typed subclasses (`RoleInsufficientError`, `ShareLinkExpiredError`, `StaleWriteError`, `RateLimitedError`, ...) and `is*` guards.
- **Utils** — `base64` and `sha256` helpers.

## Development

```bash
bun install
bun run typecheck          # tsc --noEmit
bun run test:unit          # hermetic Vitest suite (fake network) — this is what CI runs
bun run test:integration   # LOCAL ONLY: spawns the real screenwriter_api + Postgres (see below)
bun run build              # Vite library build -> dist/index.js, tsc .d.ts, fix-esm-imports
bun run clean              # rimraf dist
```

There is no lint script. Use `bun run test:unit` (not `bun test`, which would use Bun's own runner instead of Vitest).

### Integration tests

`test:integration` runs `tests/*-integration.test.ts` and `tests/integration.test.ts`, which spawn the sibling `../screenwriter_api` as a child process against a local Postgres `screenwriter_test` database (`DATABASE_URL=postgres://localhost:5432/screenwriter_test`, `AI_TEST_MODE=1`). They require the `screenwriter_api` repo checked out as a sibling and Postgres running, so they are local-dev-only and are excluded from the unit suite and CI.

### Local sibling source

When the sibling repos `../screenwriter_types`, `../writing_core` (and `../screenwriter_api`) are checked out, `tsconfig.json` `paths` and the Vitest aliases in `vitest.shared.ts` redirect `@sudobility/screenwriter_types`, `@sudobility/writing_core`, `yjs` and `lib0` to that sibling source for fast local iteration. Each redirect applies only when the sibling exists; otherwise it falls through to the installed npm dependency (CI checks out only this repo).

<a name="single-yjs"></a>
### Single Yjs

`yjs` and `lib0` must resolve to a single instance at runtime — locally through `../writing_core/node_modules`. The Vite build keeps `yjs` (and `react`, `@tanstack/react-query`, and the sibling packages) external for the same reason: a second Yjs instance breaks `Y.Doc` interop with every other consumer of the same document.

## License

BUSL-1.1
