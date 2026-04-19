import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const result = await esbuild.build({
  entryPoints: [path.join(__dirname, 'api', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(__dirname, 'api', 'index.js'),
  external: [
    'ws',
    'pg',
    'better-sqlite3',
    'lightningcss',
    '@babel/core',
    '@babel/preset-typescript',
    'postcss',
  ],
  format: 'esm',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  packages: 'external',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('API bundle built successfully');
console.log(`Entry points: ${result.metafile?.inputs ? Object.keys(result.metafile.inputs).length : 'unknown'} files`);

// Remove the TypeScript source to prevent conflicts with the compiled JS
import fs from 'fs';
const tsPath = path.join(__dirname, 'api', 'index.ts');
if (fs.existsSync(tsPath)) {
  fs.unlinkSync(tsPath);
  console.log('Removed api/index.ts (compiled to api/index.js)');
}
