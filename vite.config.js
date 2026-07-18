import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Separa dependências de terceiros estáveis (React, ícones) do código
        // do app: elas mudam raramente entre deploys, então o navegador pode
        // reaproveitar o cache desse chunk mesmo quando src/App.jsx muda.
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    // A interface completa e os parsers de documentos tornam alguns fluxos
    // jsdom mais pesados. Dez segundos evita falhas intermitentes sem esconder
    // travamentos reais.
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
})
