import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf makes invoice PDFs on the server and doesn't bundle well, so Node loads it directly.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
