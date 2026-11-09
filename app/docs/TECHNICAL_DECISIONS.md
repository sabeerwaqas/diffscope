# Technical Decisions

## TD-001: Bitbucket workspace app as the initial host

**Status:** Provisional; development-site validation pending.

Use the official `bitbucket-workspace-global-page-custom-ui` Forge template.
It gives the current project a documented Bitbucket workspace page and React
Custom UI without depending on Global App EAP enrollment.

Global Apps remain EAP, and the documented `global:ui` module supports UI Kit,
not Custom UI. The app's cross-product Jira/Confluence authorization remains
unverified; do not treat the host choice as proof those products are connected.

## TD-002: TypeScript and Vite foundation

**Status:** Implemented locally.

The official Bitbucket Custom UI scaffold is JavaScript and its generated
package lock did not match its package manifest. The available TypeScript
Global UI template would change the selected extension point and UI framework.
Keep the Bitbucket module and convert its resolver and Custom UI to strict
TypeScript. Use Vite for the static Custom UI bundle and keep the manifest
resource path unchanged. The frontend is built locally into
`static/hello-world/build`; no manual Forge packaging mode is enabled.

## TD-003: Request only Bitbucket scopes initially

**Status:** Implemented locally.

The app uses the user-context pull-request and diffstat APIs. Its manifest
requests only `read:pullrequest:bitbucket` and `read:repository:bitbucket`.
Forge lint rejects combining Bitbucket workspace scopes with Jira or
Confluence site scopes. Jira/Confluence API access is deferred until a
compatible multi-product architecture is selected. Forge KVS is now used for minimal explicit repository mappings only. The
storage key is namespaced by installation, workspace, and repository. Broader
source-content retention remains deferred.

## TD-004: Do not deploy or install without a confirmed site

**Status:** Pending external input.

The Developer Space is confirmed, but no development workspace URL or product
access has been verified. Deployment and installation are deferred until the
target environment and site authorization are confirmed.

## TD-005: Defer live Jira and Confluence access

**Status:** Pending architecture decision.

Forge lint reports `MANIFEST_INVALID_RULE` when the Bitbucket workspace scopes
are combined with Jira or Confluence site scopes. Keep this app Bitbucket-only
for now. Do not retain nonfunctional Jira/Confluence resolver calls or add
their scopes to this manifest. Select a Forge-supported multi-product design
before implementing live cross-product requests.
