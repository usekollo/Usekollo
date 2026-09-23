import type { NextConfig } from "next";

// Origins the browser is allowed to talk to. Built from the same public env
// the client already uses, so adding a service in .env does not silently leave
// the policy behind and break it at runtime instead.
const connectOrigins = [
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL,
  process.env.NEXT_PUBLIC_HORIZON_URL,
  process.env.NEXT_PUBLIC_API_URL,
]
  .filter((value): value is string => Boolean(value))
  .map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      // Relative values (NEXT_PUBLIC_API_URL is often "") are same-origin and
      // already covered by 'self'.
      return "";
    }
  })
  .filter(Boolean);

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * The honest limitation: `script-src` still needs 'unsafe-inline', because
 * Next injects inline bootstrap scripts and this app has no nonce pipeline.
 * So this policy does not stop script injection outright.
 *
 * What it does do is cut the payoff. The access and refresh tokens live in
 * JavaScript-readable cookies, so an injected script can read them — but
 * `connect-src` limits where it can *send* them to the handful of origins
 * below, and `form-action`/`base-uri` close the two usual ways of smuggling
 * data out without fetch(). That is worth having on its own, and it is the
 * part of the token-storage risk that can be fixed without rearchitecting
 * auth.
 */
const csp = [
  `default-src 'self'`,
  // 'unsafe-eval' is React Refresh in dev only; production gets neither.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and the component library inject style attributes at runtime.
  `style-src 'self' 'unsafe-inline'`,
  // Avatars are served from object storage, whose host is configured per
  // environment; data:/blob: cover the local preview before an upload lands.
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  // WalletConnect/Reown talks to more hosts than its own name suggests: the
  // picker calls api.web3modal.org for project limits and the wallet registry,
  // and blocking those makes the modal fail to open rather than degrade. wss:
  // is the relay, which has no fixed origin per project.
  `connect-src 'self' ${connectOrigins.join(" ")} wss: ` +
    `https://*.walletconnect.com https://*.walletconnect.org ` +
    `https://*.web3modal.org https://*.reown.com`,
  // The wallet picker and Albedo sign in a popup, not a frame; nothing this
  // app renders needs to embed a third party.
  `frame-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Full URLs leak goal ids and reset tokens to third parties otherwise.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Two years, subdomains included. Only meaningful over HTTPS, so browsers
  // ignore it in local development.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
