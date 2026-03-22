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
    MFE_PREVIEW_AUTH_GATEWAY_URL:
      process.env.MFE_PREVIEW_AUTH_GATEWAY_URL ??
      loaded.MFE_PREVIEW_AUTH_GATEWAY_URL ??
      process.env.MFE_PREVIEW_AUTH_ISSUER_URL ??
      loaded.MFE_PREVIEW_AUTH_ISSUER_URL ??
      "https://login.suncoast.systems",
    MFE_PREVIEW_AUTH_APP_SLUG:
      process.env.MFE_PREVIEW_AUTH_APP_SLUG ??
      loaded.MFE_PREVIEW_AUTH_APP_SLUG ??
      "example-mfe-preview",
    MFE_PREVIEW_AUTH_CODE_PARAM:
      process.env.MFE_PREVIEW_AUTH_CODE_PARAM ?? loaded.MFE_PREVIEW_AUTH_CODE_PARAM ?? "gateway_code",
    MFE_PREVIEW_PORT: process.env.MFE_PREVIEW_PORT ?? loaded.MFE_PREVIEW_PORT ?? "4173",
  };
}

export function asEsbuildDefines(env) {
  return {
    __MFE_PREVIEW_AUTH_GATEWAY_URL__: JSON.stringify(env.MFE_PREVIEW_AUTH_GATEWAY_URL),
    __MFE_PREVIEW_AUTH_APP_SLUG__: JSON.stringify(env.MFE_PREVIEW_AUTH_APP_SLUG),
    __MFE_PREVIEW_AUTH_CODE_PARAM__: JSON.stringify(env.MFE_PREVIEW_AUTH_CODE_PARAM),
  };
}
