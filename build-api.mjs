import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entryFile = path.join(__dirname, 'api', 'handler.ts');
const outFile = path.join(__dirname, 'api', 'index.js');

console.log(`Building API from: ${entryFile}`);
console.log(`Output file: ${outFile}`);
console.log(`Project root: ${__dirname}`);
console.log(`Entry file exists: ${fs.existsSync(entryFile)}`);

try {
  // Build the API handler into a single bundled file
  const result = await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: outFile,
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
  if (fs.existsSync(outFile)) {
    const size = fs.statSync(outFile).size;
    console.log(`✓ api/index.js: ${(size / 1024).toFixed(1)}KB`);
  } else {
    throw new Error('Failed to create api/index.js');
  }
} catch (error) {
  console.error('Build error:', error.message);
  console.error('Full error:', error);
  process.exit(1);
}
