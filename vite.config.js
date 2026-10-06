import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.PIXVAULT_PATH || '/pixvault/' });
