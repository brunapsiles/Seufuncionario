import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // A interface completa e os parsers de documentos tornam alguns fluxos
    // jsdom mais pesados. Dez segundos evita falhas intermitentes sem esconder
    // travamentos reais.
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
})
