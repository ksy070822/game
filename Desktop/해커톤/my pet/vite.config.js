import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ai-factory/',
  server: {
    fs: {
      deny: ['**/google-ai studio/**']
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // AI 서비스 모듈들을 메인 번들에 포함시켜 별도 chunk 분리 방지
        manualChunks: (id) => {
          // AI 서비스 관련 모듈들을 모두 main에 포함
          if (id.includes('services/ai/')) {
            return 'main'
          }
        }
      }
    }
  }
})
