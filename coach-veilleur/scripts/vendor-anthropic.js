// Regroupe le SDK Claude officiel en un seul module pour l'appli (aucun bundler côté appli).
import { build } from 'esbuild';
await build({
  entryPoints: ['src/anthropic-entree.js'],
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
  outfile: 'www/vendor/anthropic.js', legalComments: 'eof', logLevel: 'info',
});
