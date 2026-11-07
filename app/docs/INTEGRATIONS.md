# Integrations

## Current state

The read-only Bitbucket pull-request and changed-file calls are implemented in
`src/atlassian-api.ts`, exposed through a Forge resolver, and surfaced in the
Custom UI. No live call has been verified because Bitbucket account recovery
is pending. Jira and Confluence UI states are demo-only at present.

## Bitbucket

Use Forge's authenticated Bitbucket API for repository and pull-request data.
The first UI action reads a pull request and a bounded (500 item) diffstat
page, showing its title, state, branches, author, changed paths, and line
counts. It does not retrieve the patch contents or build/test evidence.
Implemented read scopes are `read:pullrequest:bitbucket` and
`read:repository:bitbucket`.

The app's current UI host is Bitbucket. Confirm a real Bitbucket Cloud
development workspace and validate repository access before live testing.
Verify event coverage separately; do not assume general Forge product
triggers provide every pull-request lifecycle event needed.

## Jira and Confluence

Forge classifies Bitbucket's `read:pullrequest:bitbucket` and
`read:repository:bitbucket` as workspace scopes. Jira and Confluence use site
scopes. `forge lint` rejects a manifest that combines these scope families,
so this Bitbucket app cannot request Jira or Confluence scopes. The local demo
shows sample issue/page panels only; it sends no live requests for those
products.

Choose a supported multi-product architecture before implementing Jira and
Confluence calls. Do not claim that adding those products to a user's account
connects them to this app. Any chosen integration must remain read-only,
respect the active user's permissions, and avoid personal API tokens.

## Events and refresh

Begin with a user-triggered refresh. Add triggers only for documented event
types that are available to the selected installation. Use a schedule for
reconciliation only after defining quotas, cursor semantics, and failure
reporting. Deduplicate events, guard against out-of-order state, and expose
last-success timestamps.

## Rovo

Rovo availability is unverified. No agent or action is included in this app.
If enabled, initial actions should read assessments and explain findings using
stored evidence. Any operation that creates or changes a source-system issue
requires explicit user approval.

## Official API references

- [Bitbucket REST API from Forge](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestbitbucket/)
- [Jira REST API from Forge](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestjira/)
- [Confluence REST API from Forge](https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product.requestconfluence/)
- [Forge permissions and scopes](https://developer.atlassian.com/platform/forge/manifest-reference/permissions/)
