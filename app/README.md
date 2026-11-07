# DiffScope

DiffScope is an Atlassian Forge app for evidence-backed impact analysis of
Bitbucket pull requests against related Jira work, Confluence documentation,
and verification evidence.

## Current foundation

The app is registered as a standard Forge app with a Bitbucket workspace global
page. Its frontend is a React and TypeScript Custom UI; its Forge resolver is
TypeScript. The UI provides a read-only Bitbucket pull-request/diffstat
resolver. Jira and Confluence panels show sample data in local demo mode and
explain why live access is unavailable in this app. Persistent relationship
mapping, automatic analysis/synchronization, storage, and Rovo actions are not
implemented. Live Bitbucket API behavior still needs to be tested in an
installed development site.

Forge rejects manifests that combine Bitbucket workspace scopes with Jira or
Confluence site scopes. The current registered app therefore requests only
the Bitbucket scopes it needs. Jira and Confluence require a separate
architecture decision before live API calls can be added.

This is not a Forge Global App. Global Apps are an EAP capability; the
documented `global:ui` experience currently uses UI Kit rather than Custom UI.
The installed app uses a Bitbucket workspace page instead. Confirm the
development workspace and cross-product permissions before adding integrations.

The current dependency audit reports transitive advisories in the production
Custom UI dependency tree through `@forge/bridge` (including Atlassian editor
and glob packages). A normal `npm audit fix` was applied; the remaining
suggested fix downgrades `@forge/bridge` to 5.5.0. That breaking downgrade was
not applied. Re-evaluate the advisories and available upstream fixes before
handling production data or releasing the app.

## Prerequisites

- Node.js 22.23.4 or newer in the 22.x line, or 24.22.1 or newer in the 24.x
  line, as required by the current Forge CLI. A Node version manager is
  recommended so system Node installations are not changed.
- npm (bundled with Node.js).
- Forge CLI 15.x.
- Git.
- Access to an Atlassian Developer Space and a Bitbucket Cloud development
  workspace. Jira, Confluence, and Rovo access are optional until those
  integrations are enabled and verified.

Do not install TypeScript globally. The root and frontend packages include
local TypeScript dependencies.

## Local environment

In this development environment, Node and Forge CLI are installed under the
user's home directory; no system-wide Node/npm settings were changed:

```bash
export PATH="$HOME/.local/share/diffscope-tools/node-v22.23.4/bin:$HOME/.local/share/diffscope-tools/forge-cli/node_modules/.bin:$PATH"
node --version
npm --version
forge --version
git --version
```

For a fresh environment, install a supported Node LTS release using a
user-owned Node version manager, then install the Forge CLI without `sudo`:

```bash
npm install --prefix "$HOME/.local/share/diffscope-tools/forge-cli" @forge/cli@15
export PATH="$HOME/.local/share/diffscope-tools/forge-cli/node_modules/.bin:$PATH"
forge --version
```

See Atlassian's [Forge setup guide](https://developer.atlassian.com/platform/forge/getting-started/)
for current Node requirements and account setup.

## Forge AI development tools

The workspace is already configured for Atlassian's public Forge MCP server
and Atlassian Design System MCP server in `.vscode/mcp.json`. Forge skills are
available to VS Code and Copilot through the workspace's
`.github/skills/.forge-skills.json` configuration and `.github/skills/`
directory. The MCP servers provide documentation and design-system lookup;
they do not require credentials or replace the Forge CLI.

On a fresh VS Code setup, open the workspace and enable its configured MCP
servers when prompted. If using GitHub Copilot CLI outside VS Code, install
Atlassian's Forge AI Plugin with the current official command:

```bash
copilot plugin install atlassian/forge-skills
```

Restart the Copilot session after installing so its skills and MCP tools load.
See Atlassian's [Forge AI development toolkit](https://developer.atlassian.com/platform/forge/ai-development-toolkit/forge-ai-plugin/)
for current installation instructions.

## Authentication and site access

Log in interactively. Create an Atlassian API-scoped token through Atlassian's
account security settings and enter it only into the Forge CLI prompt. Never
put tokens, passwords, or other credentials in source files or chat.

```bash
forge login
forge whoami
forge developer-spaces list
```

The app requires a Bitbucket Cloud workspace for installation and testing.
Confirm the workspace is accessible and that the installing account can
authorize the requested scopes. The manifest declares the Bitbucket read
scopes `read:pullrequest:bitbucket` and `read:repository:bitbucket`.
Although Jira and Confluence have been added to the account/site, their scopes
cannot be combined with these Bitbucket workspace scopes in this Forge app.
Rovo availability is unverified.

Bitbucket account recovery is pending. No site has been installed or changed;
wait until access is restored to confirm the workspace and test authorization.

## Install dependencies and verify locally

Run these commands from the Forge app directory:

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

For a standalone local UI preview, run `npm run dev` from
`static/hello-world`, then open `http://localhost:3000/?demo=1`. This explicit
demo mode uses simulated resolver data and clearly indicates that Forge APIs
and Atlassian product data are not connected. Without `?demo=1`, the Bitbucket
form calls the Forge resolver and therefore must be opened inside an Atlassian
product.

The Forge app's Custom UI resource is built into
`static/hello-world/build`. To test the integrated app against a development
site, the app must first be installed there and run through `forge tunnel`;
that requires a Bitbucket workspace and access. After Bitbucket access is
restored, deploy the app to a development environment and install/upgrade it
only on the confirmed development workspace to grant the declared Bitbucket
scopes. This has not been done. See Atlassian's
[Custom UI tunneling guide](https://developer.atlassian.com/platform/forge/tunneling/)
for current requirements.

The committed lockfiles should be kept in sync with their respective
`package.json` files. If a dependency is intentionally changed, use npm to
update the lockfile and rerun the clean install and verification commands.

## Create, deploy, and install

This app was scaffolded with the official
`bitbucket-workspace-global-page-custom-ui` Forge template in the **DiffScope**
Developer Space. The app ID and generated manifest are maintained by Forge;
do not replace or hand-edit the app ID.

No development workspace has been installed or verified in this setup. Before
deploying or installing, confirm the exact Bitbucket workspace and environment,
review the manifest scopes, and obtain authorization for any live-site changes.
Do not use production for development testing.

## Relevant documentation

- [Forge Bitbucket workspace global page](https://developer.atlassian.com/platform/forge/manifest-reference/modules/bitbucket-workspace-global-page/)
- [Forge app compatibility](https://developer.atlassian.com/platform/forge/app-compatibility/)
- [Forge permissions and scopes](https://developer.atlassian.com/platform/forge/manifest-reference/permissions/)
- [Forge Custom UI resources](https://developer.atlassian.com/platform/forge/extend-ui-with-custom-options/)
- [Forge CLI](https://developer.atlassian.com/platform/forge/cli-reference/)
- [Project architecture](./docs/ARCHITECTURE.md)
- [Development plan](./docs/DEVELOPMENT_PLAN.md)
