const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "";
const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function mediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalized}` : `${appBasePath}${normalized}`;
}
