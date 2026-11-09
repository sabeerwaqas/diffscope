# Development Plan

## Completed foundation work

- [x] Inspect the environment and preserve system Node/npm configuration.
- [x] Install a supported Node version and Forge CLI in user-owned directories.
- [x] Authenticate the Forge CLI without placing credentials in project files.
- [x] Create and select the `DiffScope` Developer Space.
- [x] Scaffold a Bitbucket workspace Custom UI app with official Forge tooling.
- [x] Add strict TypeScript checks and a Vite Custom UI build.
- [x] Clean-install both dependency trees, build the UI, type-check the
  resolver, and lint the Forge manifest.
- [x] Document prerequisites and setup in the README.

## Blocking verification

- [ ] Restore Bitbucket account access and confirm an accessible Bitbucket
  Cloud development workspace.
- [ ] Choose a Forge-compatible architecture for Jira and Confluence: their
  site scopes cannot be combined with this app's Bitbucket workspace scopes.
- [ ] Verify whether Rovo is available in the development site.
- [ ] Revisit the eight Custom UI production advisories when a compatible
  upstream Forge Bridge fix is available; current npm audit remediation is a
  breaking downgrade to Forge Bridge 5.5.0.

## Roadmap

1. Complete site, module, API scope, and authorization checks; record the
   architecture decision.
2. Add Vitest and focused tests; add CI checks for type-checking, lint, and
   frontend build.
   - [x] Vitest and focused UI/domain tests.
   - [ ] CI workflow (deferred; this workspace has no Git repository).
3. [x] Implement the initial read-only Bitbucket pull-request and changed-file
   retrieval surface. Repository selection and live testing remain.
4. Add read-only Jira and Confluence adapters after resolving the scope-family
   constraint with an approved architecture.
5. Define normalized data models and deterministic impact analysis with
   evidence-focused tests.
   - [x] Exact-path deterministic impact analysis.
   - [x] Forge KVS persistence and resolver CRUD for explicit repository mappings.
   - [x] UI for creating, listing, and deleting mappings.
   - [x] Display confirmed mapping evidence and unmapped changed paths.
   - [ ] Validate live Forge storage and workspace context on an installed development site.
   - [ ] Address concurrent mapping edits before multi-user production use.
6. Add manual refresh, then confirmed event sources, idempotent processing,
   retries, and reconciliation.
7. [x] Build the initial PR UI and demo-only Jira/Confluence panels.
   - [x] Add an evidence-backed impact assessment from explicit mappings.
   - [ ] Live multi-product onboarding remains deferred.
8. Add a Rovo agent only if available; keep its first actions read-only and
   assessment-backed.
9. Complete permission, tenant isolation, rate-limit, retention, and
   dependency checks before release.

Do not claim a feature is implemented or tested until its code and validation
exist. Do not deploy or install to a site without confirming the target and
authorization.
