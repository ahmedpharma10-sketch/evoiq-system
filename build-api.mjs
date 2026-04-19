import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build the API handler into a single bundled file
const result = await esbuild.build({
  entryPoints: [path.join(__dirname, 'api', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: path.join(__dirname, 'api', 'index.js'),
  format: 'esm',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  packages: 'external', // Mark all node_modules as external
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  banner: {
    js: `import.meta.url; // Preserve import.meta for ESM compatibility`,
  },
});

console.log('✓ API bundle created successfully');

// Verify the file was created
const jsPath = path.join(__dirname, 'api', 'index.js');
if (fs.existsSync(jsPath)) {
  const size = fs.statSync(jsPath).size;
  console.log(`✓ api/index.js: ${(size / 1024).toFixed(1)}KB`);
} else {
  throw new Error('Failed to create api/index.js');
}
