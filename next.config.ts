import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server (bound to 0.0.0.0 via `dev:https`) accept requests
  // whose Origin is the LAN IP instead of "localhost" — otherwise Next's
  // dev-only cross-origin protection 403s every JS/RSC asset request and the
  // page never hydrates (buttons look present but do nothing). Update this
  // if your machine's LAN IP changes (DHCP). See `npm run dev:https`.
  allowedDevOrigins: ["192.168.1.58"],
};

export default nextConfig;
