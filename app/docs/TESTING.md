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

## Manual Bitbucket development-site test plan

Use a dedicated **shared Bitbucket workspace** and a disposable repository. Do
not use a company production workspace. Forge Bitbucket apps are not supported
on personal workspaces. Keep the app in the development environment.

### 1. Local checks

From the repository root:

```bash
git fetch origin
git checkout feat/complete-bitbucket-pagination
git pull --ff-only
cd app
npm ci
npm run typecheck
cd static/hello-world
npm ci
npm test
npm run build
cd ../..
forge lint
```

All commands must exit successfully. The UI build must finish before Forge
lint because the manifest points at the generated build directory.

### 2. Deploy and install in a test workspace

From `app/` after logging in to Forge:

```bash
forge whoami
forge deploy -e development
```

For a first-time installation:

```bash
forge install --site https://bitbucket.org/YOUR-WORKSPACE --product Bitbucket -e development
```

Use the Bitbucket workspace URL, not a Jira/Confluence `.atlassian.net` site URL. If the app is already installed, apply the
development version with:

```bash
forge install --upgrade --site https://bitbucket.org/YOUR-WORKSPACE --product Bitbucket -e development
```

Confirm the installation is visible in the Bitbucket workspace and open the
DiffScope workspace page. Do not deploy to production for this test.

### 3. Pull request read test

Create a disposable PR containing at least:
- one modified file;
- one added file;
- one deleted file, if supported by the repository's normal workflow.

In DiffScope, enter the exact workspace slug, repository slug, and PR number.
Compare the returned title, state, branches, author, file paths, statuses, and
line counts with Bitbucket's PR page. Confirm the PR link opens the same PR.

Pass condition: the returned changed-file list matches Bitbucket's PR diffstat.
If the list differs, record the PR number and expected/actual paths; do not
trust impact coverage until this is resolved.

### 4. Mapping and persistence test

1. Save a mapping for one changed path using a real HTTPS Jira/Confluence
   reference URL (the URL is stored as a reference; it is not fetched).
2. Load saved mappings and verify the mapping appears.
3. Refresh the DiffScope page, load mappings again, and verify it remains.
4. Delete the mapping and verify it disappears after another refresh.
5. Try a traversal path such as `../secret.txt` and an HTTP URL. Both must be
   rejected without saving.
6. If you have a second test workspace, install the app there and verify its
   mapping list does not expose the first workspace's mappings.

Pass condition: only valid mappings are stored, refresh does not lose data,
and repository/workspace boundaries are respected.

### 5. Impact and coverage test

1. Map exactly one changed path to an artifact.
2. Load the PR and saved mappings.
3. Confirm the artifact appears under Impact assessment with the mapped path
   shown as evidence.
4. Confirm every other distinct changed path appears under Unmapped changed
   files.
5. Select Create mapping on an unmapped path. Confirm the path field is
   pre-filled, then save a mapping and reload the assessment.
6. Verify coverage equals mapped distinct changed paths divided by all
   distinct changed paths, rounded to the nearest whole percent.
7. Verify zero changed files shows Not applicable rather than 0%.
8. A truncated file list must display the incomplete-assessment warning.

### 6. Failure and access tests

- Use a nonexistent PR number: expect a clear not-found/access message.
- Use a repository slug your account cannot access: expect a safe error.
- Revoke or deny repository access in the test account: expect an access error,
  not a blank successful assessment.
- Restore access and retry: the request should work again.
- Do not try to force rate limits against a real workspace. HTTP 401/403/404/
  429 behavior is covered by mocked tests; record any live error separately.

### Test evidence to capture

For each manual run, record the test workspace, repository, PR number,
expected changed-file count, actual count, mapping count, coverage percentage,
and pass/fail. Capture screenshots of the PR result, persisted mappings after
refresh, and the final impact assessment. Redact workspace-private information
before sharing screenshots.

### Known limits of the current test plan

The automated pagination test covers multiple pages and rejects an unsafe
pagination URL. A live PR with more than 500 changed files is still needed to
exercise the pagination boundary against Bitbucket itself. Multi-user
simultaneous mapping edits are not a supported acceptance test yet because
the current KVS read-modify-write model can race.
