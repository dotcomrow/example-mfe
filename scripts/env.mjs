import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function readEnvironment(mode = "production") {
  const cwd = process.cwd();
  const files = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    ".env.local",
    ".env",
  ];

  const loaded = {};
  for (const name of files) {
    const fullPath = path.join(cwd, name);
    if (!fs.existsSync(fullPath)) {
      continue;
    }
    const parsed = dotenv.parse(fs.readFileSync(fullPath));
    Object.assign(loaded, parsed);
  }

  return {
    MFE_DEFAULT_GRAPHQL_HTTP_URL:
      process.env.MFE_DEFAULT_GRAPHQL_HTTP_URL ?? loaded.MFE_DEFAULT_GRAPHQL_HTTP_URL ?? "",
    MFE_DEFAULT_GRAPHQL_WS_URL:
      process.env.MFE_DEFAULT_GRAPHQL_WS_URL ?? loaded.MFE_DEFAULT_GRAPHQL_WS_URL ?? "",
    MFE_DEFAULT_GRAPHQL_AUTH_TOKEN:
      process.env.MFE_DEFAULT_GRAPHQL_AUTH_TOKEN ?? loaded.MFE_DEFAULT_GRAPHQL_AUTH_TOKEN ?? "",
    MFE_PREVIEW_AUTH_ISSUER_URL:
      process.env.MFE_PREVIEW_AUTH_ISSUER_URL ??
      loaded.MFE_PREVIEW_AUTH_ISSUER_URL ??
      "https://auth.suncoast.systems",
    MFE_PREVIEW_AUTH_CLIENT_ID:
      process.env.MFE_PREVIEW_AUTH_CLIENT_ID ?? loaded.MFE_PREVIEW_AUTH_CLIENT_ID ?? "",
    MFE_PREVIEW_AUTH_AUDIENCE:
      process.env.MFE_PREVIEW_AUTH_AUDIENCE ?? loaded.MFE_PREVIEW_AUTH_AUDIENCE ?? "",
    MFE_PREVIEW_AUTH_SCOPE:
      process.env.MFE_PREVIEW_AUTH_SCOPE ?? loaded.MFE_PREVIEW_AUTH_SCOPE ?? "openid profile email",
    MFE_PREVIEW_PORT: process.env.MFE_PREVIEW_PORT ?? loaded.MFE_PREVIEW_PORT ?? "4173",
  };
}

export function asEsbuildDefines(env) {
  return {
    __MFE_DEFAULT_GRAPHQL_HTTP_URL__: JSON.stringify(env.MFE_DEFAULT_GRAPHQL_HTTP_URL),
    __MFE_DEFAULT_GRAPHQL_WS_URL__: JSON.stringify(env.MFE_DEFAULT_GRAPHQL_WS_URL),
    __MFE_DEFAULT_GRAPHQL_AUTH_TOKEN__: JSON.stringify(env.MFE_DEFAULT_GRAPHQL_AUTH_TOKEN),
    __MFE_PREVIEW_AUTH_ISSUER_URL__: JSON.stringify(env.MFE_PREVIEW_AUTH_ISSUER_URL),
    __MFE_PREVIEW_AUTH_CLIENT_ID__: JSON.stringify(env.MFE_PREVIEW_AUTH_CLIENT_ID),
    __MFE_PREVIEW_AUTH_AUDIENCE__: JSON.stringify(env.MFE_PREVIEW_AUTH_AUDIENCE),
    __MFE_PREVIEW_AUTH_SCOPE__: JSON.stringify(env.MFE_PREVIEW_AUTH_SCOPE),
  };
}
