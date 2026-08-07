import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Academia — Student Planner",
    short_name: "Academia",
    description:
      "Track tasks and projects, plan your week, and never miss a class.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e1015",
    theme_color: "#0e1015",
    orientation: "portrait-primary",
    categories: ["productivity", "education"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // padded so Android's circular/squircle mask never clips the monogram
        src: "/icon1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
