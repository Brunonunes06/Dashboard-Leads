import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      port: 3001,       // Força o ecossistema React a rodar na porta 3001
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