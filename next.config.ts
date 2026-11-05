import type { NextConfig } from "next";
import { site } from "./src/data/site";

// Pages are prerendered, so there is no per-request nonce and Next's inline scripts
// need 'unsafe-inline'. Inline styles carry template designs and the PDF page rules.
// Photos are blob: or data: URLs. Everything else is same-origin. The app uses no
// <base>, frames or web workers, so those are refused outright.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "worker-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

const headers = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // No page opens or is opened by another window, so cross-origin windows get no handle to it.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(site.url.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  ...(site.indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an X-Powered-By header.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
