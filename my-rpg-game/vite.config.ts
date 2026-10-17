import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin'; // 追加

export default defineConfig({
  // 既存の設定
  base: './',
  server: { host: true },
  
  // プラグインにcloudflare()を追加する
  plugins: [
    cloudflare()
  ],
});