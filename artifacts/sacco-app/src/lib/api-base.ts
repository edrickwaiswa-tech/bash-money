import { setBaseUrl } from "@workspace/api-client-react";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

setBaseUrl(configuredApiBaseUrl || null);

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredApiBaseUrl
    ? `${configuredApiBaseUrl}${normalizedPath}`
    : `${appBasePath}${normalizedPath}`;
}
