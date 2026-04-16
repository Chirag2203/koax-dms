import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@dms/config-tailwind/tailwind.preset.js'),
  ],
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};

export default config;
