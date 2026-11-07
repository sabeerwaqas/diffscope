# Security and Reliability

## Current security posture

- The app declares only read-only Bitbucket pull request and repository
  scopes; it has no external egress, storage, or secret configuration.
- No Atlassian credentials or personal tokens are stored in the repository.
- Read-only API calls run through Forge resolvers in user context. The app
  retrieves pull request metadata and one page of diffstat. Jira and
  Confluence calls are not implemented because Forge lint rejects mixing their
  site scopes with Bitbucket workspace scopes. No source-system write is
  implemented.
- The app ID is the Forge-generated identifier in `manifest.yml`; do not
  replace it manually.
- Forge's `.forge/` directory is ignored because local CLI state may contain
  sensitive material.

## Requirements before live testing and release

1. Use the least-privilege scopes required by selected REST operations.
2. Prefer user-context access where the feature should reflect the current
   user's source permissions. If app-context calls are needed, verify the
   user's authorization before exposing results.
3. Keep installation/workspace boundaries in every storage key and query.
4. Validate resolver inputs and construct API paths using Forge's safe `route`
   helpers.
5. Avoid logging issue/page contents, tokens, or unnecessary personal data.
6. Make event processing idempotent and reject stale source versions.
7. Record source URLs, identifiers, and evidence provenance; do not fabricate
   missing evidence or test outcomes.
8. Define retention and deletion behavior before persisting source content.
9. Require explicit user approval before any source-system write.
10. Test permission denial, revoked access, rate limits, retries, and tenant
    isolation before release.
11. Choose a Forge-compatible multi-product architecture before attempting
    Jira or Confluence access. Site product availability alone does not
    connect those products to this Bitbucket app.

## Dependency audit note

The backend production dependency audit currently reports no vulnerabilities.
The Custom UI production dependency audit reports eight transitive advisories
(five high, three moderate) through the current `@forge/bridge` dependency
tree. A non-forced `npm audit fix` was applied; the remaining suggested
remediation downgrades `@forge/bridge` to 5.5.0. That breaking downgrade and
unreviewed overrides were not applied. Reassess the upstream packages before
handling production data or releasing the app.

## References

- [Forge security](https://developer.atlassian.com/platform/forge/security/)
- [Forge tenant data isolation](https://developer.atlassian.com/platform/forge/tenant-data-isolation/)
- [Forge permissions](https://developer.atlassian.com/platform/forge/manifest-reference/permissions/)
- [Forge storage data lifecycle](https://developer.atlassian.com/platform/forge/storage-reference/hosted-storage-data-lifecycle/)
