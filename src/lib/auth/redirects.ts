/** Keep post-login navigation inside this application's protected admin area. */
export function safeAdminPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/admin")) {
    return "/admin";
  }

  if (value.includes("\\")) {
    return "/admin";
  }

  try {
    const destination = new URL(value, "https://admin.invalid");
    if (
      destination.origin !== "https://admin.invalid" ||
      (destination.pathname !== "/admin" &&
        !destination.pathname.startsWith("/admin/"))
    ) {
      return "/admin";
    }

    return `${destination.pathname}${destination.search}`;
  } catch {
    return "/admin";
  }
}

/**
 * Next.js can normalize request.url to localhost for a server bound to 127.0.0.1.
 * The actual Host header supplies the application authority. Forwarded headers
 * are deliberately ignored; an invalid Host never falls back to another origin.
 */
export function applicationOrigin(request: Request): string | null {
  try {
    const requestUrl = new URL(request.url);
    if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
      return null;
    }

    const host = request.headers.get("host");
    if (host === null) return requestUrl.origin;
    if (!host || /[\s,/@\\?#%]/.test(host) || host.endsWith(":")) {
      return null;
    }

    const origin = new URL(`${requestUrl.protocol}//${host}`);
    if (
      origin.username || origin.password || origin.pathname !== "/" ||
      origin.search || origin.hash || !origin.hostname
    ) {
      return null;
    }

    // URL validates bracketed IPv6. DNS/IPv4 hosts additionally need valid
    // ASCII labels, including the single-label localhost development host.
    if (!origin.hostname.startsWith("[")) {
      const hostname = origin.hostname.replace(/\.$/, "");
      if (
        hostname.length > 253 ||
        !hostname.split(".").every((label) =>
          /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
        )
      ) {
        return null;
      }
    }

    return origin.origin;
  } catch {
    return null;
  }
}

/** Browser POSTs must originate from this application, including login/logout. */
export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  const expectedOrigin = applicationOrigin(request);
  return (
    request.method === "POST" &&
    origin !== null &&
    expectedOrigin !== null &&
    origin === expectedOrigin
  );
}

export const PRIVATE_CACHE_CONTROL =
  "private, no-cache, no-store, must-revalidate, max-age=0";
