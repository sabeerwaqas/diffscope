# Initial Data Model

The pure exact-path impact analysis is implemented in
[`src/impact-analysis.ts`](../src/impact-analysis.ts). It only emits artifact
relationships from explicit repository-scoped mappings and preserves matching
changed paths as evidence. Unmapped paths remain separate; no relationship is
inferred from filenames or text.

## Implemented persistence

Explicit path-to-artifact mappings are persisted through Forge KVS
(`@forge/kvs`). The storage key is namespaced with the trusted Forge
installation ID, Bitbucket workspace ID, and repository slug. The resolver
derives the repository ID from Forge context; the browser cannot supply an
installation or workspace ID.

Each repository currently stores its mappings as one bounded JSON value:
- Maximum 500 mappings per repository.
- Maximum 200 KiB serialized mapping payload.
- Exact normalized repository-relative paths only.
- Artifact URLs must be HTTPS.
- Mapping CRUD is exposed through `listRepositoryMappings`,
  `saveRepositoryMapping`, and `deleteRepositoryMapping`.

This is an MVP storage model. Concurrent writes to the same repository can
race because the current implementation uses read-modify-write on one KVS
value. If multi-user concurrent editing becomes a requirement, move mappings
to individual Custom Entity Store records with indexed repository queries or
use an appropriate transactional design. KVS storage is installation-scoped;
the key namespace adds explicit workspace/repository separation.

## Proposed broader model

The following entities remain proposed, not implemented. Store additional
data only after tenant isolation, access checks, and retention behavior have
been verified.

| Entity | Purpose | Initial fields |
| --- | --- | --- |
| `Workspace` | Forge installation and settings boundary | installation ID, Bitbucket workspace ID, configuration version, created/updated timestamps |
| `ConnectedResource` | Product resources available to this installation | product, source resource ID, canonical URL, display name, access state, last-seen timestamp |
| `Repository` | Selected Bitbucket repository | repository UUID, workspace UUID, slug, display name, selected state |
| `PullRequest` | Minimal PR state used for assessments | repository ID, PR ID, title, source/target branch, state, head commit hash, source URL, updated timestamp |
| `Artifact` | Jira issue, Confluence page, or verification reference | product, source ID/key, title, URL, status/space metadata, source updated timestamp |
| `Assessment` | Versioned evaluation of a PR revision | repository ID, PR ID, head hash, status, created/completed timestamps, source version markers |
| `ImpactFinding` | Evidence-backed outcome of one assessment | assessment ID, finding type, relationship class, explanation, evidence references, source URL, qualitative confidence, recommendation, verification status |
| `DependencyMapping` | Explicitly configured artifact dependency | source artifact reference, target artifact reference, relation type, configuration provenance |
| `SyncState` | Cursor and last successful refresh per source | product/resource ID, cursor or watermark, last attempt/success, status, error category |
| `SyncEvent` | Event deduplication and processing state | event key, source resource, event version/time, status, retry count, processed timestamp |

Persist IDs, hashes, timestamps, evidence references, and the smallest
necessary excerpts. Define retention, user deletion, and uninstall behavior
before storing source content. Avoid copying entire Jira issues or Confluence
pages.
