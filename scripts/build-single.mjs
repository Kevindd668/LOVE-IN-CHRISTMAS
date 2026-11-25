import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectRoot, 'dist');
const indexPath = resolve(distDir, 'index.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');

const linkPattern = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
html = html.replace(linkPattern, (tag) => {
  const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
  if (!hrefMatch) return tag;
  const assetPath = resolve(distDir, hrefMatch[1].replace(/^\.\//, ''));
  if (!existsSync(assetPath)) {
    throw new Error(`Stylesheet not found: ${assetPath}`);
  }
  const css = readFileSync(assetPath, 'utf8');
  return `<style>\n${css}\n</style>`;
});

const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi;
html = html.replace(scriptPattern, (tag, src) => {
  const assetPath = resolve(distDir, String(src).replace(/^\.\//, ''));
  if (!existsSync(assetPath)) {
    throw new Error(`Script not found: ${assetPath}`);
  }
  const js = readFileSync(assetPath, 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});

html = html.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, '');
html = html.replace(
  '<head>',
  `<head>\n    <!--\n      A Christmas Wish · standalone edition\n      Everything (Three.js, styles and the 3D scene) is inlined into this single file.\n      Open it directly in Chrome or Edge. No server or network connection is required.\n    -->`
);

const outputPath = resolve(projectRoot, 'Christmas-Wish.html');
writeFileSync(outputPath, html, 'utf8');
copyFileSync(outputPath, resolve(projectRoot, '..', 'Christmas-Wish.html'));

const leftoverAssets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
  .map((match) => match[1])
  .filter((value) => !value.startsWith('data:') && !value.startsWith('#') && value !== './');

const size = (statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`Standalone gift written:`);
console.log(`  ${outputPath}`);
console.log(`  ${resolve(projectRoot, '..', 'Christmas-Wish.html')}`);
console.log(`  size: ${size} MB`);
if (leftoverAssets.length > 0) {
  console.warn('External references still present:', leftoverAssets);
}
