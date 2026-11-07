# Testing

## Local validation available

Run from the Forge app directory:

```bash
npm ci
npm run typecheck
cd static/hello-world
npm ci
npm test
npm run build
cd ../..
forge lint
```

The frontend build must run before `forge lint` because the manifest references
the generated `static/hello-world/build` Custom UI resource.

## Current baseline

The TypeScript resolver check, frontend TypeScript check, Vite production
bundle, and Forge manifest lint have passed locally. Clean npm installs pass
from both lockfiles. The backend production dependency audit reports no
vulnerabilities. The frontend production dependency audit still reports
transitive advisories through `@forge/bridge`; see [Security](./SECURITY.md).

Vitest is configured for the Custom UI with jsdom. Focused tests cover local
demo interactions, Bitbucket resolver calls, PR/diffstat response mapping,
input validation, explicit API errors, and deterministic repository-scoped
impact mapping. Jira and Confluence samples are tested as demo-only; no live
calls are made. No live permission or real-site tests have been added. Forge
deployment packaging and installation have not been verified on a development
site.

## Planned test coverage

- Unit tests for deterministic relationship and evidence classification.
- Adapter contract tests for incomplete responses, denied permissions,
  pagination, and rate limits.
- Idempotency and stale-event tests for synchronization.
- UI states for loading, empty, inaccessible, and failed integrations.
- Tenant isolation and retention/deletion checks.
- Real Bitbucket/Jira/Confluence authorization tests on an explicitly
  authorized development site.
