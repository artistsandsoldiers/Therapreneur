import type { MetadataRoute } from "next";

/** Lets practitioners add the app to their phone's home screen (decision 0005). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Therapreneur",
    short_name: "Therapreneur",
    start_url: "/invoices",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
