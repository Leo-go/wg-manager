import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["ssh2", "cpu-features", "ssh2-streams"],
};

export default nextConfig;
