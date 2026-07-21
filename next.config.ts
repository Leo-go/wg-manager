import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["ssh2", "cpu-features", "ssh2-streams"],
  // Only the installer script — do NOT glob all of ssh2 (can blow past Vercel function size)
  outputFileTracingIncludes: {
    "/api/servers/[id]/setup": ["./scripts/install-vless-reality.sh"],
  },
};

export default nextConfig;
