import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas E2E contra el servidor vivo (`npm run dev -- --webpack` en el
 * puerto 3000), frente a un proxy HTTPS local (puerto 3443) para que las
 * cookies Secure/__Host- funcionen como en producción sobre Cloudflare.
 * Levantar antes: `node scripts/local-https-proxy.js`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "https://localhost:3443",
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 60000,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  workers: 1,
  projects: [
    {
      name: "chromium",
      use: { ...devices["desktop Chrome"] },
    },
  ],
});
