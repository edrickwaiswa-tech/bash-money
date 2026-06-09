import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

setBaseUrl(configuredApiBaseUrl || null);
setAuthTokenGetter(() => localStorage.getItem("bmm_auth_token"));

const nativeFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const isApiRequest = url.startsWith("/api") || (configuredApiBaseUrl && url.startsWith(configuredApiBaseUrl));
  if (!isApiRequest) return nativeFetch(input, init);

  const token = localStorage.getItem("bmm_auth_token");
  const headers = new Headers(init.headers);
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return nativeFetch(input, {
    ...init,
    credentials: "include",
    headers,
  });
};

export function setStoredAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem("bmm_auth_token", token);
  } else {
    localStorage.removeItem("bmm_auth_token");
  }
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredApiBaseUrl
    ? `${configuredApiBaseUrl}${normalizedPath}`
    : `${appBasePath}${normalizedPath}`;
}
