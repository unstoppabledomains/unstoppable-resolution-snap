import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';
import * as dotenv from "dotenv"
dotenv.config({});

const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
  },
  environment: {
    UNSTOPPABLE_API_KEY: process.env.UNSTOPPABLE_API_KEY,
  }
};
export default config;
