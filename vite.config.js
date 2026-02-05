import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium()],
  base: './' // Use relative paths for assets so it works on any repo name/subpath
});