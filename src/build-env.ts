declare const __MFE_PREVIEW_AUTH_GATEWAY_URL__: string;
declare const __MFE_PREVIEW_AUTH_APP_SLUG__: string;
declare const __MFE_PREVIEW_AUTH_CODE_PARAM__: string;

function asDefault(value: string | undefined): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export const buildEnvDefaults = {
  previewAuthGatewayUrl: asDefault(__MFE_PREVIEW_AUTH_GATEWAY_URL__),
  previewAuthAppSlug: asDefault(__MFE_PREVIEW_AUTH_APP_SLUG__),
  previewAuthCodeParam: asDefault(__MFE_PREVIEW_AUTH_CODE_PARAM__),
};
