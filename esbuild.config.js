const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['./src/index.tsx'],
    bundle: true,
    outfile: 'bundle.js',
    sourcemap: true,
    loader: { '.tsx': 'tsx' },
    watch: true,
  })
  .then(() => {
    console.log('Build complete. Watching for changes...');
  })
  .catch(() => process.exit(1));
