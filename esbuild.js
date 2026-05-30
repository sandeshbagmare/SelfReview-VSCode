const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'out/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    plugins: [
      {
        name: 'watch-plugin',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('❌ Extension build failed');
            } else {
              console.log('✅ Extension build succeeded');
            }
          });
        }
      }
    ]
  });

  const webviewCtx = await esbuild.context({
    entryPoints: ['src/webview/index.tsx'],
    bundle: true,
    format: 'iife',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'browser',
    outfile: 'media/webview.js',
    logLevel: 'silent',
    plugins: [
      {
        name: 'watch-plugin',
        setup(build) {
          build.onEnd(result => {
            if (result.errors.length > 0) {
              console.error('❌ Webview build failed');
            } else {
              console.log('✅ Webview build succeeded');
            }
          });
        }
      }
    ]
  });

  if (watch) {
    await ctx.watch();
    await webviewCtx.watch();
    console.log('👀 Watching for changes...');
  } else {
    await ctx.rebuild();
    await webviewCtx.rebuild();
    await ctx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
