import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf makes invoice PDFs on the server and doesn't bundle well, so Node loads it directly.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Logo uploads go through a server action, which allows 1 MB by default. Logos can be up to 1 MB, plus form overhead.
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  // pdfkit loads its built-in fonts by a path Vercel can't trace, so ship them with the pages that make PDFs.
  outputFileTracingIncludes: {
    "/claims/**": ["./node_modules/pdfkit/js/standard-fonts/**"],
    "/invoices/**": ["./node_modules/pdfkit/js/standard-fonts/**"],
  },
};

export default nextConfig;
