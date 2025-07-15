import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

const alias = {
  '@': path.resolve(__dirname, 'src'),
};

export default defineConfig({
  resolve: {
    alias,
  },
  plugins: [
    electron([
      {
        // Main-Process entry.
        entry: path.resolve(__dirname, 'src/main/main.ts'),
        vite: { resolve: { alias } },
      },
      {
        entry: path.resolve(__dirname, 'src/components/preload/preload.ts'),
        onstart(options) {
          options.reload();
        },
        vite: { resolve: { alias } },
      },
    ]),
    renderer(),
  ],
});