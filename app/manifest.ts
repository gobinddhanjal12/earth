import type { MetadataRoute } from "next";

import { siteDescription, siteName } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "Living Planet",
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#01030a",
    theme_color: "#01030a",
    lang: "en",
    categories: ["education", "science"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
