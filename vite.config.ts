import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    routeFileIgnorePattern: "assets/.*",
  },
  // Sem isso, o preset padrão daqui é "cloudflare-module" (Workers) — o
  // build não roda com um simples `node .output/server/index.mjs` em host
  // Node comum (Railway, Render, VPS). "node-server" é o preset do Nitro
  // pra isso: gera um servidor Node de verdade, que já lê PORT do ambiente
  // sozinho (igual o Railway injeta).
  nitro: { preset: "node-server" },
  vite: {
    server: {
      port: 3001, // Força o ecossistema React a rodar na porta 3001
      strictPort: true, // Evita desvios automáticos de portas para não quebrar o proxy
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@supabase/supabase-js",
        "@react-oauth/google",
        "recharts",
        "@tanstack/react-query",
      ],
    },
  },
});

