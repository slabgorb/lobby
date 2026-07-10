import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Served under /lobby/ on arcade.slabgorb.com, mirroring tempest's /tempest/
  // base. Vite rewrites root-relative asset URLs to honour this base in both dev
  // and build, so index.html's /src/main.ts resolves correctly.
  base: '/',
  // Pin a dedicated port (tempest owns 5273). strictPort fails loudly on a
  // collision instead of silently wandering to the next free port.
  server: {
    port: 5270,
    strictPort: true,
    // The Cloudflare tunnel forwards requests with Host: arcade.slabgorb.com.
    // Vite blocks unrecognised Hosts (DNS-rebinding protection) unless they are
    // allow-listed, so the tunnel would otherwise get a 403.
    allowedHosts: ['arcade.slabgorb.com'],
  },
  preview: {
    port: 5270,
    strictPort: true,
    allowedHosts: ['arcade.slabgorb.com'],
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
