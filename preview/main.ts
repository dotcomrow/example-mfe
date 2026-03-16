import { buildEnvDefaults } from "../src/build-env";
import { MODULE_KEY } from "../src/constants";
import { createCmsModuleDefinition } from "../src/host-adapter";

type Cleanup = (() => void) | undefined;
type AuthStatusState = "idle" | "ok" | "error";
type ThemeMode = "auto" | "light" | "dark";

type OidcDiscovery = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
};

type AuthFormState = {
  issuerUrl: string;
  clientId: string;
  audience: string;
  scope: string;
};

type PkceSessionState = AuthFormState & {
  state: string;
  codeVerifier: string;
  createdAt: number;
};

const AUTH_TOKEN_STORAGE_KEY = "mfe.preview.authToken";
const AUTH_FORM_STORAGE_KEY = "mfe.preview.authFormState";
const PKCE_SESSION_STORAGE_KEY = "mfe.preview.pkceSessionState";
const THEME_STORAGE_KEY = "suncoast:cms:theme-mode";
const PKCE_MAX_AGE_MS = 10 * 60 * 1000;
const DEFAULT_PREVIEW_GRAPHQL_HTTP_URLS = {
  dev: "https://cf-suncoast-graphql-proxy.dev.suncoast.systems/graphql",
  prod: "https://cf-suncoast-graphql-proxy.prod.suncoast.systems/graphql",
} as const;

function inferPreviewEnvironment(): "dev" | "prod" {
  const hostname = window.location.hostname.trim().toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".dev.suncoast.systems") ||
    hostname.includes("preview")
  ) {
    return "dev";
  }
  return "prod";
}

function toWebSocketUrl(httpUrl: string): string {
  const normalized = httpUrl.trim();
  if (!normalized) {
    return "";
  }
  try {
    const parsed = new URL(normalized);
    parsed.protocol = parsed.protocol === "http:" ? "ws:" : "wss:";
    return parsed.toString();
  } catch {
    if (normalized.startsWith("https://")) {
      return `wss://${normalized.slice("https://".length)}`;
    }
    if (normalized.startsWith("http://")) {
      return `ws://${normalized.slice("http://".length)}`;
    }
    return normalized;
  }
}

function inferDefaultGraphqlHttpUrl(): string {
  const environment = inferPreviewEnvironment();
  return environment === "dev"
    ? DEFAULT_PREVIEW_GRAPHQL_HTTP_URLS.dev
    : DEFAULT_PREVIEW_GRAPHQL_HTTP_URLS.prod;
}

function getInput(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Missing input element #${id}`);
  }
  return element;
}

function getHost(): HTMLElement {
  const element = document.getElementById("host");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing host element #host");
  }
  return element;
}

function getButton(id: string): HTMLButtonElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Missing button element #${id}`);
  }
  return element;
}

function getAuthStatusElement(): HTMLElement {
  const element = document.getElementById("authStatus");
  if (!(element instanceof HTMLElement)) {
    throw new Error("Missing auth status element #authStatus");
  }
  return element;
}

const httpUrlInput = getInput("httpUrl");
const wsUrlInput = getInput("wsUrl");
const authTokenInput = getInput("authToken");
const authIssuerInput = getInput("authIssuer");
const authClientIdInput = getInput("authClientId");
const authAudienceInput = getInput("authAudience");
const authScopeInput = getInput("authScope");
const conversationIdInput = getInput("conversationId");
const applyButton = getButton("applyButton");
const loginButton = getButton("loginButton");
const clearTokenButton = getButton("clearTokenButton");
const themeToggleButton = getButton("themeToggle");
const authStatus = getAuthStatusElement();
const host = getHost();

httpUrlInput.value = inferDefaultGraphqlHttpUrl();
wsUrlInput.value = toWebSocketUrl(httpUrlInput.value);
authIssuerInput.value = buildEnvDefaults.previewAuthIssuerUrl || "https://auth.suncoast.systems";
authClientIdInput.value = buildEnvDefaults.previewAuthClientId;
authAudienceInput.value = buildEnvDefaults.previewAuthAudience;
authScopeInput.value = buildEnvDefaults.previewAuthScope || "openid profile email";
conversationIdInput.value = "";

let currentAbort: AbortController | null = null;
let currentCleanup: Cleanup;

loadSavedAuthForm();
authTokenInput.value = getSavedToken();

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

function parseJsonObject<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getSavedToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

function getSavedTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)?.trim();
    if (raw === "auto" || raw === "light" || raw === "dark") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write errors in preview harness.
  }
}

function inferSystemTheme(): ThemeMode {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function resolveThemeForRender(theme: ThemeMode): "light" | "dark" {
  if (theme === "auto") {
    const system = inferSystemTheme();
    return system === "dark" ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme: ThemeMode): void {
  const resolvedTheme = resolveThemeForRender(theme);
  document.documentElement.setAttribute("data-theme-mode", theme);
  document.documentElement.setAttribute("data-theme-mode-resolved", resolvedTheme);
  const label =
    theme === "auto"
      ? "Theme: Auto"
      : theme === "light"
      ? "Theme: Light"
      : "Theme: Dark";
  themeToggleButton.textContent = label;
}

function initializeTheme(): ThemeMode {
  const initial = getSavedTheme() ?? "auto";
  applyTheme(initial);
  return initial;
}

function saveToken(value: string): void {
  const token = value.trim();
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write errors in preview harness.
  }
}

function saveAuthForm(): void {
  const state: AuthFormState = {
    issuerUrl: authIssuerInput.value.trim(),
    clientId: authClientIdInput.value.trim(),
    audience: authAudienceInput.value.trim(),
    scope: authScopeInput.value.trim(),
  };
  try {
    localStorage.setItem(AUTH_FORM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors in preview harness.
  }
}

function loadSavedAuthForm(): void {
  const state = parseJsonObject<AuthFormState>(
    (() => {
      try {
        return localStorage.getItem(AUTH_FORM_STORAGE_KEY);
      } catch {
        return null;
      }
    })(),
  );
  if (!state) {
    return;
  }

  if (state.issuerUrl) authIssuerInput.value = state.issuerUrl;
  if (state.clientId) authClientIdInput.value = state.clientId;
  if (state.audience) authAudienceInput.value = state.audience;
  if (state.scope) authScopeInput.value = state.scope;
}

function setAuthStatus(message: string, state: AuthStatusState = "idle"): void {
  authStatus.textContent = message;
  if (state === "idle") {
    authStatus.removeAttribute("data-state");
    return;
  }
  authStatus.setAttribute("data-state", state);
}

function clearAuthParamsFromUrl(clearHash = false): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  if (clearHash) {
    url.hash = "";
  }

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}

function normalizeIssuerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, "");
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      throw new Error("issuer must use https");
    }
    return parsed.toString().replace(/\/+$/g, "");
  } catch {
    throw new Error("Auth Issuer URL must be a valid https URL");
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomBase64Url(byteCount = 32): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(digest));
}

async function fetchOidcDiscovery(issuerUrl: string): Promise<OidcDiscovery> {
  const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load OIDC metadata (${response.status})`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const authorizationEndpoint =
    typeof payload.authorization_endpoint === "string"
      ? payload.authorization_endpoint.trim()
      : "";
  const tokenEndpoint =
    typeof payload.token_endpoint === "string"
      ? payload.token_endpoint.trim()
      : "";

  if (!authorizationEndpoint || !tokenEndpoint) {
    throw new Error("OIDC metadata missing authorization_endpoint or token_endpoint");
  }

  return {
    authorizationEndpoint,
    tokenEndpoint,
  };
}

function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

async function startLoginRedirect(): Promise<void> {
  try {
    const issuerUrl = normalizeIssuerUrl(authIssuerInput.value);
    const clientId = authClientIdInput.value.trim();
    const audience = authAudienceInput.value.trim();
    const scope = authScopeInput.value.trim() || "openid profile email";

    if (!clientId) {
      throw new Error("Auth Client ID is required before logging in");
    }

    saveAuthForm();
    setAuthStatus("Loading auth metadata...");
    const discovery = await fetchOidcDiscovery(issuerUrl);

    const state = randomBase64Url(24);
    const codeVerifier = randomBase64Url(48);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const redirectUri = getRedirectUri();

    const sessionState: PkceSessionState = {
      issuerUrl,
      clientId,
      audience,
      scope,
      state,
      codeVerifier,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(PKCE_SESSION_STORAGE_KEY, JSON.stringify(sessionState));

    const authorizeUrl = new URL(discovery.authorizationEndpoint);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    if (audience) {
      authorizeUrl.searchParams.set("audience", audience);
    }

    window.location.assign(authorizeUrl.toString());
  } catch (error) {
    setAuthStatus(`Login setup failed: ${toErrorMessage(error)}`, "error");
  }
}

async function tryHandleAuthRedirect(): Promise<void> {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    const implicitToken = hashParams.get("access_token")?.trim() || "";
    if (implicitToken) {
      authTokenInput.value = implicitToken;
      saveToken(implicitToken);
      setAuthStatus("Login complete. Access token loaded.", "ok");
      clearAuthParamsFromUrl(true);
      return;
    }
  }

  const callbackUrl = new URL(window.location.href);
  const code = callbackUrl.searchParams.get("code")?.trim() || "";
  const returnedState = callbackUrl.searchParams.get("state")?.trim() || "";
  const authError = callbackUrl.searchParams.get("error")?.trim() || "";
  const authErrorDescription =
    callbackUrl.searchParams.get("error_description")?.trim() || "";

  if (authError) {
    setAuthStatus(
      authErrorDescription || `Login failed: ${authError}`,
      "error",
    );
    clearAuthParamsFromUrl(true);
    return;
  }

  if (!code) {
    return;
  }

  const sessionState = parseJsonObject<PkceSessionState>(
    sessionStorage.getItem(PKCE_SESSION_STORAGE_KEY),
  );

  if (!sessionState) {
    setAuthStatus("Missing login session state. Retry login.", "error");
    clearAuthParamsFromUrl(true);
    return;
  }

  if (Date.now() - sessionState.createdAt > PKCE_MAX_AGE_MS) {
    sessionStorage.removeItem(PKCE_SESSION_STORAGE_KEY);
    setAuthStatus("Login session expired. Retry login.", "error");
    clearAuthParamsFromUrl(true);
    return;
  }

  if (!returnedState || returnedState !== sessionState.state) {
    sessionStorage.removeItem(PKCE_SESSION_STORAGE_KEY);
    setAuthStatus("State validation failed. Retry login.", "error");
    clearAuthParamsFromUrl(true);
    return;
  }

  try {
    setAuthStatus("Exchanging auth code for access token...");
    const discovery = await fetchOidcDiscovery(sessionState.issuerUrl);
    const tokenBody = new URLSearchParams();
    tokenBody.set("grant_type", "authorization_code");
    tokenBody.set("code", code);
    tokenBody.set("client_id", sessionState.clientId);
    tokenBody.set("redirect_uri", getRedirectUri());
    tokenBody.set("code_verifier", sessionState.codeVerifier);

    const tokenResponse = await fetch(discovery.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenErrorBody = (await tokenResponse.text()).slice(0, 200);
      throw new Error(
        `Token exchange failed (${tokenResponse.status}) ${tokenErrorBody}`,
      );
    }

    const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
    const accessToken =
      typeof tokenPayload.access_token === "string"
        ? tokenPayload.access_token.trim()
        : "";

    if (!accessToken) {
      throw new Error("Token response missing access_token");
    }

    authTokenInput.value = accessToken;
    saveToken(accessToken);
    sessionStorage.removeItem(PKCE_SESSION_STORAGE_KEY);
    setAuthStatus("Login complete. Access token loaded.", "ok");
  } catch (error) {
    setAuthStatus(`Login callback failed: ${toErrorMessage(error)}`, "error");
  } finally {
    clearAuthParamsFromUrl(true);
  }
}

async function mountFromForm() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (typeof currentCleanup === "function") {
    currentCleanup();
    currentCleanup = undefined;
  }

  const abortController = new AbortController();
  currentAbort = abortController;

  const moduleDefinition = createCmsModuleDefinition(MODULE_KEY);

  const props = {
    title: "AI Assistant MFE (Local)",
    inputPlaceholder: "Ask a question...",
    submitLabel: "Send",
    assistantLabel: "AI",
    maxMessages: 50,
    requestCommand: "mfe.example.chat.send",
    async: {
      enabled: true,
      mode: "kafka-graphql-bridge",
      requestChannel: "graphql.async.requests.v1",
      responseChannel: "graphql.async.responses.v1",
      correlationIdPath: "publish_async_request.request_id",
    },
    graphql: {
      httpUrl: httpUrlInput.value.trim(),
      wsUrl: wsUrlInput.value.trim(),
      authToken: authTokenInput.value.trim(),
      submitMutation:
        "mutation PublishAsyncRequest($input: json!) { publish_async_request(input: $input) }",
      submitVariables: {
        input: {
          handler: "ai-service",
          operation: "chat.completion",
          payload: {
            prompt: "{{prompt}}",
            conversationId: "{{conversationId}}",
          },
          metadata: {
            moduleKey: "{{moduleKey}}",
            instanceId: "{{instanceId}}",
            source: "{{source}}",
            asyncMode: "{{asyncMode}}",
            requestChannel: "{{requestChannel}}",
            responseChannel: "{{responseChannel}}",
            correlationIdPath: "{{correlationIdPath}}",
          },
          expires_in_seconds: 86400,
        },
      },
      submitRequestIdPath: "publish_async_request.request_id",
      streamSubscription:
        "subscription StreamClientAsyncMessage($requestId: String!, $responseChannel: String!) { graphql_client_async_messages(where: { _and: [{ request_id: { _eq: $requestId } }, { kafka_topic: { _eq: $responseChannel } }] }, order_by: { updated_at: desc }, limit: 1) { request_id status response_payload error_payload completed_at updated_at } }",
      streamVariables: {
        requestId: "{{requestId}}",
        responseChannel: "{{responseChannel}}",
      },
      streamTextPath: "graphql_client_async_messages.0.response_payload",
      streamDonePath: "graphql_client_async_messages.0.status",
      streamErrorPath: "graphql_client_async_messages.0.error_payload",
      streamChunkMode: "replace",
      conversationId: conversationIdInput.value.trim(),
    },
  };

  const maybeCleanup = await moduleDefinition.mount({
    element: host,
    moduleKey: MODULE_KEY,
    props,
    signal: abortController.signal,
    environment: {
      source: "local-preview",
      cacheKey: "local-preview",
      contentHash: "",
    },
  });

  saveToken(authTokenInput.value.trim());
  currentCleanup = typeof maybeCleanup === "function" ? maybeCleanup : undefined;
}

for (const input of [
  authIssuerInput,
  authClientIdInput,
  authAudienceInput,
  authScopeInput,
]) {
  input.addEventListener("change", () => {
    saveAuthForm();
  });
}

authTokenInput.addEventListener("change", () => {
  saveToken(authTokenInput.value.trim());
});

applyButton.addEventListener("click", () => {
  void mountFromForm();
});

let activeTheme: ThemeMode = initializeTheme();

themeToggleButton.addEventListener("click", () => {
  activeTheme = activeTheme === "auto" ? "light" : activeTheme === "light" ? "dark" : "auto";
  saveTheme(activeTheme);
  applyTheme(activeTheme);
});

try {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = () => {
    if (activeTheme === "auto") {
      applyTheme("auto");
    }
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleSystemThemeChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(handleSystemThemeChange);
  }
} catch {
  // Ignore unavailable matchMedia support in preview harness.
}

loginButton.addEventListener("click", () => {
  void startLoginRedirect();
});

clearTokenButton.addEventListener("click", () => {
  authTokenInput.value = "";
  saveToken("");
  setAuthStatus("Token cleared", "ok");
  void mountFromForm();
});

async function bootstrap() {
  await tryHandleAuthRedirect();
  await mountFromForm();
}

void bootstrap();
