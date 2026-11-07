# Initial Data Model

The pure exact-path impact analysis is implemented in
[`src/impact-analysis.ts`](../src/impact-analysis.ts). It only emits artifact
relationships from explicit repository-scoped mappings and preserves the
matching changed paths as evidence. Unmapped paths remain separate; no
relationship is inferred from filenames or text. The persisted entities below
remain proposed, not implemented.

This is a proposed model, not an implemented schema. Store data only after
tenant isolation, access checks, and retention behavior have been verified.

| Entity | Purpose | Initial fields |
| --- | --- | --- |
| `Workspace` | Forge installation and settings boundary | installation ID, Bitbucket workspace ID, configuration version, created/updated timestamps |
| `ConnectedResource` | Product resources available to this installation | product, source resource ID, canonical URL, display name, access state, last-seen timestamp |
| `Repository` | Selected Bitbucket repository | repository UUID, workspace UUID, slug, display name, selected state |
| `ServiceMapping` | Explicit path-to-service or artifact mapping | repository ID, normalized exact path, service key, optional Jira component/page/test references |
| `PullRequest` | Minimal PR state used for assessments | repository ID, PR ID, title, source/target branch, state, head commit hash, source URL, updated timestamp |
| `Artifact` | Jira issue, Confluence page, or verification reference | product, source ID/key, title, URL, status/space metadata, source updated timestamp |
| `Assessment` | Versioned evaluation of a PR revision | repository ID, PR ID, head hash, status, created/completed timestamps, source version markers |
| `ImpactFinding` | Evidence-backed outcome of one assessment | assessment ID, finding type, relationship class, explanation, evidence references, source URL, qualitative confidence, recommendation, verification status |
| `DependencyMapping` | Explicitly configured artifact dependency | source artifact reference, target artifact reference, relation type, configuration provenance |
| `SyncState` | Cursor and last successful refresh per source | product/resource ID, cursor or watermark, last attempt/success, status, error category |
| `SyncEvent` | Event deduplication and processing state | event key, source resource, event version/time, status, retry count, processed timestamp |

Use the Forge installation as the tenant boundary. Query keys and indexes must
include the relevant source identifiers and installation context. Do not use
module-level state or an in-memory cache for tenant data.

Persist IDs, hashes, timestamps, evidence references, and the smallest
necessary excerpts. Define retention, user deletion, and uninstall behavior
before storing source content. Avoid copying entire Jira issues or Confluence
pages.

Candidate storage is Forge Custom Entity Store for indexed records and Forge
KVS for small configuration. No storage permissions or entities are currently
declared in the app.
