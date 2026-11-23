import { useMutation, useQuery } from "@tanstack/react-query";
import type { EntityListQuery, NoteSummary } from "@sudobility/screenwriter_types";
import { useScreenwriterClient } from "./client-context";
import { STALE_TIMES } from "./query-config";
import { queryKeys } from "./query-keys";

/**
 * Projection-backed document reads (B10). Every hook takes an optional `source` (`live`, `snapshot:<id>`, `version:<id>`) and
 * sits under `queryKeys.reads(did)`, so a mutation that changes the document (`useApplyCommands`) refreshes them. Live reads
 * are never "fresh" for long: an open editor keeps its own replica, and these are for panels, lists and tools.
 */

interface Opts {
  enabled?: boolean;
}

/** The character / location / prop lists (`kind` filters, `q` searches names and aliases). */
export function useEntities(did: string | undefined, query: Partial<EntityListQuery> = {}, opts: Opts = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.entities(did ?? "", query),
    queryFn: () => client.listEntities(did as string, query),
    staleTime: STALE_TIMES.LISTS,
    enabled: !!did && (opts.enabled ?? true),
  });
}

export function useEntity(did: string | undefined, eid: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.entity(did ?? "", eid ?? "", source),
    queryFn: () => client.getEntity(did as string, eid as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && !!eid,
  });
}

/** The delete guard and *Show usages* list (`total` is what blocks a delete). Always refetched on mount: it is a guard. */
export function useEntityUsage(did: string | undefined, eid: string | undefined, query: { variantId?: string; source?: string } = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.entityUsage(did ?? "", eid ?? "", query),
    queryFn: () => client.getEntityUsage(did as string, eid as string, query),
    staleTime: 0,
    enabled: !!did && !!eid,
  });
}

export function useEntityDialogue(did: string | undefined, eid: string | undefined, query: { sceneIds?: string[]; source?: string } = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.entityDialogue(did ?? "", eid ?? "", query),
    queryFn: () => client.getEntityDialogue(did as string, eid as string, query),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && !!eid,
  });
}

export function useTagCategories(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.tagCategories(did ?? "", source),
    queryFn: () => client.listTagCategories(did as string, source),
    staleTime: STALE_TIMES.LISTS,
    enabled: !!did,
  });
}

export function useTags(did: string | undefined, query: { sceneId?: string; categoryId?: string; entityId?: string; source?: string } = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.tags(did ?? "", query),
    queryFn: () => client.listTags(did as string, query),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useNotes(did: string | undefined, query: { sceneId?: string; type?: string; status?: NoteSummary["status"]; origin?: NoteSummary["commentSource"]; category?: string; visible?: boolean; source?: string } = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.notes(did ?? "", query),
    queryFn: () => client.listNotes(did as string, query),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useBeats(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.beats(did ?? "", source),
    queryFn: () => client.listBeats(did as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useBin(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.bin(did ?? "", source),
    queryFn: () => client.getBin(did as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useRevisions(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.revisions(did ?? "", source),
    queryFn: () => client.listRevisions(did as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useChanges(did: string | undefined, query: { authorId?: string; sceneId?: string; source?: string } = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.changes(did ?? "", query),
    queryFn: () => client.listChanges(did as string, query),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useAlternates(did: string | undefined, elementId: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.alternates(did ?? "", elementId ?? "", source),
    queryFn: () => client.getAlternates(did as string, elementId as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && !!elementId,
  });
}

export function useTitlePage(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.titlePage(did ?? "", source),
    queryFn: () => client.getTitlePage(did as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

/** Pages, eighths, scenes, words, runtime, INT/EXT and day/night counts. */
export function useStats(did: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.stats(did ?? "", source),
    queryFn: () => client.getStats(did as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did,
  });
}

export function useFountain(did: string | undefined, query: { sceneIds?: string[]; fromSceneId?: string; source?: string } = {}, opts: Opts = {}) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.fountain(did ?? "", query),
    queryFn: () => client.getFountain(did as string, query),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && (opts.enabled ?? true),
  });
}

export function useSceneShots(did: string | undefined, sceneId: string | undefined, source?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.sceneShots(did ?? "", sceneId ?? "", source),
    queryFn: () => client.listSceneShots(did as string, sceneId as string, source),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && !!sceneId,
  });
}

/** Resolve locators in one round trip (idle while the list is empty). Results are statuses, so ambiguity is data, not an error. */
export function useResolveLocators(did: string | undefined, locators: readonly string[], snapshotId?: string) {
  const client = useScreenwriterClient();
  return useQuery({
    queryKey: queryKeys.resolve(did ?? "", locators, snapshotId),
    queryFn: () => client.resolveLocators(did as string, [...locators], snapshotId),
    staleTime: STALE_TIMES.DETAIL,
    enabled: !!did && locators.length > 0,
  });
}

/** One-shot resolve for a "go to scene" box: `mutateAsync(ref)` throws `LocatorAmbiguousError` / `LocatorNotFoundError`. */
export function useResolveLocator(did: string) {
  const client = useScreenwriterClient();
  return useMutation({ mutationFn: (v: { ref: string; snapshotId?: string }) => client.resolveLocator(did, v.ref, v.snapshotId) });
}
