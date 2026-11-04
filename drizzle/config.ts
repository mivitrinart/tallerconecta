import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: ".data/drizzle-meta.sqlite",
  },
  verbose: true,
  strict: true,
});
