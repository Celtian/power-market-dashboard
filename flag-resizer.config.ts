import { defineConfig } from 'flag-resizer';

export default defineConfig({
  languages: {
    filter: {
      type: 'blacklist',
      values: ['*-*', 'eu', 'un'],
    },
    sizes: [
      [20, 15],
      [40, 30],
      [60, 45],
      [80, 60],
      [120, 90],
    ],
    quality: 100,
    formats: ['png'],
    output: {
      png: {
        dir: 'libs/ui/assets/flags',
        publicPath: '/flags',
      },
      ts: 'libs/ui/src/lib/flag/flag-assets.generated.ts',
    },
  },
});
