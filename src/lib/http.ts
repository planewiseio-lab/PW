export const USER_AGENT = "PlaneWise/1.0 (+https://planewise.io)";

const DEFAULT_TIMEOUT_MS = 10_000;

/** Public-registry lookups can be reused for a few hours. */
export const LOOKUP_REVALIDATE_SECONDS = 6 * 60 * 60;

export async function fetchText(
  url: string,
  options?: { timeoutMs?: number; accept?: string },
): Promise<{ ok: boolean; status: number; body: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: options?.accept ?? "*/*",
      },
      signal: controller.signal,
      next: { revalidate: LOOKUP_REVALIDATE_SECONDS },
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: "" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(
  url: string,
  options?: { timeoutMs?: number },
): Promise<T | null> {
  const result = await fetchText(url, {
    ...options,
    accept: "application/json",
  });
  if (!result.ok || !result.body) return null;
  try {
    return JSON.parse(result.body) as T;
  } catch {
    return null;
  }
}
