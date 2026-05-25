const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export type NavigationDisposition = "allow-app" | "open-external" | "deny";

export interface NavigationDecision {
  disposition: NavigationDisposition;
  reason: string;
  url: string;
}

export function getNavigationDecision(targetUrl: string, appUrl: string): NavigationDecision {
  const target = parseUrl(targetUrl);
  const app = parseUrl(appUrl);

  if (!target || !app) {
    return deny(targetUrl, "invalid-url");
  }

  if (target.origin === app.origin && isHttpLike(target)) {
    return {
      disposition: "allow-app",
      reason: "same-origin-app",
      url: target.href
    };
  }

  if (EXTERNAL_PROTOCOLS.has(target.protocol)) {
    return {
      disposition: "open-external",
      reason: "external-safe-protocol",
      url: target.href
    };
  }

  return deny(target.href, "blocked-protocol");
}

function deny(url: string, reason: string): NavigationDecision {
  return {
    disposition: "deny",
    reason,
    url
  };
}

function isHttpLike(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
