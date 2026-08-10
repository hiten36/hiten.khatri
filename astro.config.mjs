import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://hitenkhatri.vercel.app/",
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react(), sitemap()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  fonts: [
    {
      name: "Nunito",
      cssVariable: "--font-nunito",
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["latin"],
    },
    {
      name: "Space Grotesk",
      cssVariable: "--font-space-grotesk",
      provider: fontProviders.google(),
      weights: [500, 700],
      styles: ["normal"],
      subsets: ["latin"],
    },
  ],
});
