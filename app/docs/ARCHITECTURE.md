# Architecture

## Status

This is the initial design for the local Forge foundation. Only the Bitbucket
workspace page, sample resolver, and sample Custom UI are scaffolded. Product
integrations, persistence, event processing, and Rovo actions are not
implemented.

## Current host and platform decision

The registered app is a standard Forge app hosted in a Bitbucket workspace and
uses `bitbucket:workspaceGlobalPage`. It is not a Forge Global App. This is the
practical path that preserves the requested React Custom UI without depending
on Global App EAP access.

Forge documents Global Apps as EAP. Its `global:ui` module is Preview and
currently supports UI Kit (`render: native`) rather than Custom UI. Standard
multi-app compatibility is documented for Jira and Confluence; it does not
provide a general Bitbucket/Jira/Confluence global app.

The implemented Bitbucket calls use Forge's authenticated `requestBitbucket`
API. The current manifest can request Bitbucket workspace scopes, but Forge
lint rejects combining those with Jira or Confluence site scopes. Therefore
the current Bitbucket app cannot directly request all three product APIs
through this scope model. Jira and Confluence access needs a separate,
explicitly selected Forge-compatible architecture; adding products to the
account alone is insufficient.

## Proposed architecture

```text
Bitbucket workspace page (React + TypeScript Custom UI)
  -> Forge resolver functions (TypeScript)
      -> product adapters
          -> Bitbucket REST API
          -> Jira REST API (after authorization verification)
          -> Confluence REST API (after authorization verification)
      -> normalized, permission-checked records
      -> deterministic impact-analysis domain service
      -> Forge hosted storage (after retention and schema decisions)

Confirmed product events / manual refresh / scheduled reconciliation
  -> validation, deduplication, and version checks
  -> queued processing where needed
  -> source retrieval and reassessment

Rovo Agent (future, if available)
  -> read-only assessment actions grounded in persisted evidence
  -> source-system writes only after explicit user approval
```

The analysis engine must be independent of Forge API calls. Relationship
classification and evidence are deterministic; semantic suggestions, if later
added, remain explicitly inferred and do not prove a relationship.

## Freshness and failures

Manual refresh is the initial safe fallback. Add event-driven updates only for
event types that are confirmed for this installation model. Event processing
must be idempotent and guard against duplicate, delayed, or stale updates.
Scheduled reconciliation should report its last successful run and failures.
Do not describe synchronization as real-time unless that is measured and
supported.

## Platform references

- [Forge app compatibility](https://developer.atlassian.com/platform/forge/app-compatibility/)
- [Bitbucket workspace global page](https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-workspace-global-page/)
- [Forge authenticated product APIs](https://developer.atlassian.com/platform/forge/runtime-reference/fetch-api/)
- [Forge events](https://developer.atlassian.com/platform/forge/events/)
- [Forge storage](https://developer.atlassian.com/platform/forge/storage-reference/)
- [Rovo Agent module](https://developer.atlassian.com/platform/forge/manifest-reference/modules/rovo-agent/)
