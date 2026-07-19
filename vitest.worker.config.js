import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./worker.js",
      miniflare: {
        compatibilityDate: "2026-07-14",
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.resolve("./migrations"),
          ),
          // Chave VAPID exclusiva de teste (não é usada em produção) — só
          // existe para exercitar o fluxo de Web Push nos testes.
          VAPID_PUBLIC_KEY:
            "BEa6RPkBtRlZB3zsc7CJpieeD8RLYLSjWQbfWX69nASq9GcrzQNRHwKgO3T2wYgq8GRi6baoREH4uVvGPxsZC9Y",
          VAPID_PRIVATE_KEY: "WnT6_QQd2c5yTC8ClemX9Djsgtc3Bvs8zgAToy4siGA",
        },
      },
    })),
  ],
  test: {
    include: ["test/**/*.worker.test.js"],
    setupFiles: ["./test/apply-migrations.js"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
