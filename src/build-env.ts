declare const __MFE_DEFAULT_GRAPHQL_HTTP_URL__: string;
declare const __MFE_DEFAULT_GRAPHQL_WS_URL__: string;
declare const __MFE_DEFAULT_GRAPHQL_AUTH_TOKEN__: string;
declare const __MFE_PREVIEW_AUTH_ISSUER_URL__: string;
declare const __MFE_PREVIEW_AUTH_CLIENT_ID__: string;
declare const __MFE_PREVIEW_AUTH_AUDIENCE__: string;
declare const __MFE_PREVIEW_AUTH_SCOPE__: string;

function asDefault(value: string | undefined): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

export const buildEnvDefaults = {
  graphqlHttpUrl: asDefault(__MFE_DEFAULT_GRAPHQL_HTTP_URL__),
  graphqlWsUrl: asDefault(__MFE_DEFAULT_GRAPHQL_WS_URL__),
  graphqlAuthToken: asDefault(__MFE_DEFAULT_GRAPHQL_AUTH_TOKEN__),
  previewAuthIssuerUrl: asDefault(__MFE_PREVIEW_AUTH_ISSUER_URL__),
  previewAuthClientId: asDefault(__MFE_PREVIEW_AUTH_CLIENT_ID__),
  previewAuthAudience: asDefault(__MFE_PREVIEW_AUTH_AUDIENCE__),
  previewAuthScope: asDefault(__MFE_PREVIEW_AUTH_SCOPE__),
};
