# Example MFE (Suncoast Contract)

Example micro-frontend package that:

- follows the Suncoast UI module contract (`module.definition.json`)
- includes a host adapter for the current shell `CmsModuleDefinition` contract
- builds to a single browser JS file (`dist/example-mfe.js`)
- provides Directus seed data for `cms_modules`
- demonstrates GraphQL async communication:
  - submit via GraphQL HTTP mutation
  - receive streamed response via GraphQL WS subscription

## Quick Start

```bash
npm install
npm run dev
```

Local preview URL:

- `http://localhost:4173/preview/` (default)

Build production artifact:

```bash
npm run build
```

Build output:

- `dist/example-mfe.js` (single-file bundle)
- `dist/example-mfe.js.map`
- `dist/module.definition.json`

## Local vs Production GraphQL Endpoints

The bundle supports build-time default GraphQL endpoint values.

Local preview:

1. Copy `.env.local.example` to `.env.local`
2. Set test endpoints
3. Run `npm run dev`

Production build:

1. Copy `.env.production.example` to `.env.production` (or use CI secrets)
2. Run `npm run build`

Supported env vars:

- `MFE_DEFAULT_GRAPHQL_HTTP_URL`
- `MFE_DEFAULT_GRAPHQL_WS_URL`
- `MFE_DEFAULT_GRAPHQL_AUTH_TOKEN`
- `MFE_PREVIEW_AUTH_ISSUER_URL` (preview login default, usually `https://auth.suncoast.systems`)
- `MFE_PREVIEW_AUTH_CLIENT_ID` (preview login client id)
- `MFE_PREVIEW_AUTH_AUDIENCE` (preview login audience, optional)
- `MFE_PREVIEW_AUTH_SCOPE` (preview login scope, default `openid profile email`)
- `MFE_PREVIEW_PORT` (dev only)

## Local Preview Login

The local preview page (`/preview/`) now includes a login helper that runs OAuth/OIDC code+PKCE in-browser:

1. Fill `Auth Issuer URL` and `Auth Client ID` (or set `MFE_PREVIEW_AUTH_*` env vars).
2. Click `Login` on the preview page.
3. After redirect back to `/preview/`, the access token is auto-filled into `Auth Token`.
4. Click `Apply / Remount` to use that token for GraphQL HTTP/WS requests.

If your auth provider returns `access_token` in URL hash (implicit flow), the preview page will capture that too.

## What This MFE Does

- Module key: `mfe-example-chat`
- Renders a simple textbox + submit button chat UI
- Submits prompts using GraphQL mutation `publish_async_request`
- Listens for response row updates from `graphql.client_async_messages` over GraphQL subscription
- Emits module events

## Directus Setup

1. Host `dist/example-mfe.js` at a URL reachable by your shell runtime.
2. Create/update a `cms_modules` record using `directus/cms-module.seed.json`.
3. In a `cms_block_module` block, choose module key `mfe-example-chat`.
4. Use `directus/cms-block-module.props.example.json` as your `props_json` baseline.
5. Set:
   - `graphql.httpUrl` (Hasura/GraphQL gateway HTTP endpoint)
   - `graphql.wsUrl` (GraphQL WS endpoint)
   - `graphql.submitMutation` and `graphql.streamSubscription` (defaults are preconfigured for `publish_async_request` + `graphql_client_async_messages`)
   - path mappings:
     - `graphql.submitRequestIdPath`
     - `graphql.streamTextPath`
     - `graphql.streamDonePath`
     - `graphql.streamErrorPath`

If those fields are omitted in `props_json`, the MFE falls back to build-time defaults from env.

## Important Runtime Note

This repo provides the MFE contract + bundle. Your shell runtime must include or load this module definition at runtime.

If your shell currently only mounts modules from an internal registry, wire this module using the exported host adapter:

- export: `createCmsModuleDefinition()`

The bundle also self-registers at:

- `globalThis.SuncoastMfeRegistry["mfe-example-chat"]`

## Scripts

- `npm run clean` - remove `dist`
- `npm run clean:dev` - remove `dev-dist`
- `npm run typecheck` - TS type check
- `npm run build` - compile single JS + copy module definition
- `npm run dev` - local preview server with live rebuild + preview harness

## GitHub Actions

Workflows included:

- `.github/workflows/ci.yml`
  - runs typecheck/build on push + PR
  - uploads dist artifacts
- `.github/workflows/publish.yml`
  - runs on `v*` tags or manual dispatch
  - builds with production defaults from GitHub Secrets
  - uploads artifacts
  - creates a GitHub Release for tag pushes

Secrets expected by publish workflow:

- `MFE_DEFAULT_GRAPHQL_HTTP_URL`
- `MFE_DEFAULT_GRAPHQL_WS_URL`
- `MFE_DEFAULT_GRAPHQL_AUTH_TOKEN`
