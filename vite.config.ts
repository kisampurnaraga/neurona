import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * React dipisahkan ke chunk sendiri.
 *
 * Ini satu-satunya pengelompokan manual yang dipertahankan: React dipakai oleh
 * SEMUA chunk (termasuk yang lazy) dan hampir tidak pernah berubah, jadi
 * memisahkannya membuat cache browser tetap valid antar deploy. Modul lain
 * sengaja dibiarkan diatur Rollup.
 */
function manualChunks(id: string): string | undefined {
  if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react';
  return undefined;
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Batas peringatan default 500 kB membanjiri log build dengan kebisingan.
      // Pemecahan chunk sengaja TIDAK dipaksa lewat manualChunks: Rollup hanya
      // memindahkan modul yang benar-benar dipakai bersama chunk lazy, sedangkan
      // pengelompokan manual berdasarkan nama paket justru menyeret dependensi
      // library berat (recharts) ke dalam payload awal.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
    server: {
      // Allow proxied/preview hosts (Cloud Run, *.run.app, E2B sandboxes, tunnels).
      // Vite 6 rejects unknown Host headers with HTTP 403 otherwise.
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
