import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["ssh2", "cpu-features", "ssh2-streams"],
  // Ensure installer script + ssh2 native bits ship with the setup API on Vercel
  outputFileTracingIncludes: {
    "/api/servers/[id]/setup": [
      "./scripts/install-vless-reality.sh",
      "./node_modules/ssh2/**/*",
      "./node_modules/cpu-features/**/*",
    ],
  },
};

export default nextConfig;
