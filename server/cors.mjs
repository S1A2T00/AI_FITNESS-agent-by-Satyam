// Cross-origin access for a frontend hosted elsewhere (e.g. Vercel).
//
// CORS_ORIGINS is a comma-separated allow-list of exact origins, e.g.
//   CORS_ORIGINS=https://vitalis.vercel.app,https://vitalis.example.com
// A "*" wildcard is allowed only as a subdomain prefix for preview URLs:
//   https://vitalis-*.vercel.app
// Auth uses a Bearer token (no cookies), so credentials are never enabled.

function toMatcher(entry) {
  const origin = entry.trim().replace(/\/+$/, "");
  if (!origin) return null;
  if (!origin.includes("*")) return (o) => o === origin;
  // Escape regex characters, then let "*" match one DNS label fragment only.
  const pattern = origin.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+");
  const re = new RegExp(`^${pattern}$`, "i");
  return (o) => re.test(o);
}

export function createCors(list = process.env.CORS_ORIGINS || "") {
  const matchers = list.split(",").map(toMatcher).filter(Boolean);

  const isAllowed = (origin) => Boolean(origin) && matchers.some((m) => m(origin));

  /**
   * Adds CORS headers for allowed origins. Returns true when the request was a
   * preflight that has been fully answered.
   */
  function handle(req, res) {
    const origin = req.headers.origin;
    if (!origin) return false;
    res.setHeader("Vary", "Origin");
    if (!isAllowed(origin)) {
      if (req.method === "OPTIONS") {
        res.writeHead(403).end();
        return true;
      }
      return false; // browser will block the response; same-origin clients unaffected
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "600",
      });
      res.end();
      return true;
    }
    return false;
  }

  return { handle, isAllowed };
}
