# DiffScope app guidance

## Project conventions

- This app uses a Bitbucket workspace global page with a React and TypeScript
  Custom UI, built with Vite, plus a TypeScript Forge resolver.
- Preserve the registered Forge app ID and generated module wiring. Retrieve
  current Atlassian documentation before changing Forge modules, APIs, scopes,
  permissions, runtime settings, or manifest syntax.
- Use the existing toolchain and local dependencies. Keep backend and frontend
  packages and lockfiles separate.
- Keep secrets and privileged operations out of browser code. Prefer
  user-authorized access, least-privilege scopes, and explicit error states.
- Do not assume Jira, Confluence, or Rovo is available from the Bitbucket
  installation until the development site and authorization are verified.

## Validation

From the app directory, run `npm run typecheck`. From
`static/hello-world`, run `npm test` and `npm run build`. Build the frontend
before running `forge lint` from the app directory because the manifest
references the generated Custom UI resource.

## External and live actions

- Do not request or store credentials in source files or chat.
- Do not deploy, install, upgrade, grant scopes, or change a live site without
  explicit user authorization and a confirmed target.
- Preserve unrelated user changes and do not claim integrations are verified
  until tested against an authorized development site.
