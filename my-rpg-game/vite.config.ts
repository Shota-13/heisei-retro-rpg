import { defineConfig } from 'vite';

export default defineConfig({
  // 相対パス。Cloudflare(ルート配信)と、将来の Capacitor(file:// 相当)の両方で動くようにする暫定設定。
  base: './',
  server: { host: true },
  plugins: [], // ← plugins配列を追加する
});
