import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({
      routeRules: {
        // Baseline hardening for every response. A Content-Security-Policy is
        // deliberately absent: this app inlines scripts and loads TensorFlow.js
        // WASM, so a strict policy needs testing before it can be switched on.
        '/**': {
          headers: {
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'x-frame-options': 'DENY',
            'permissions-policy': 'geolocation=(), microphone=(), camera=()',
            'strict-transport-security': 'max-age=63072000; includeSubDomains',
          },
        },
      },
    }),
    viteReact(),
  ],
})
