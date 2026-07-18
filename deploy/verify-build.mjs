import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const html = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
const requiredMetadata = [
  'name="description"',
  'name="robots"',
  'rel="canonical"',
  'property="og:title"',
  'property="og:description"',
  'property="og:image"',
  'name="twitter:card"',
];
for (const metadata of requiredMetadata) {
  if (!html.includes(metadata)) throw new Error(`Storefront HTML is missing ${metadata}`);
}
const entryScripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+\.js)"/g), match => match[1]);

if (entryScripts.length !== 1) {
  throw new Error(`Expected one storefront entry script, found ${entryScripts.length}`);
}

const entryPath = path.resolve(distDir, entryScripts[0].replace(/^\//, ''));
if (!entryPath.startsWith(`${distDir}${path.sep}`)) {
  throw new Error('Storefront entry script resolves outside dist');
}

const entryCode = await fs.readFile(entryPath);
const maxEntryBytes = 500 * 1024;
if (entryCode.length > maxEntryBytes) {
  throw new Error(`Storefront entry is ${(entryCode.length / 1024).toFixed(1)} KiB; limit is 500 KiB`);
}

const dynamicRoutes = ['SellerDashboard', 'Products', 'ProductPage', 'AboutUs', 'BusinessOrder', 'AuthModal', 'PolicyView'];
const entryText = entryCode.toString('utf8');
for (const routeName of dynamicRoutes) {
  if (!new RegExp(`${routeName}-[^"']+\\.js`).test(entryText)) {
    throw new Error(`${routeName} is no longer emitted as an on-demand chunk`);
  }
  if (html.includes(`${routeName}-`)) {
    throw new Error(`${routeName} is eagerly referenced by the storefront HTML`);
  }
}

await fs.access(path.join(rootDir, 'dist-server', 'index.js'));
await fs.access(path.join(distDir, 'favicon.jpg'));

const gzipBytes = gzipSync(entryCode).length;
console.log(`Verified storefront entry: ${(entryCode.length / 1024).toFixed(1)} KiB raw, ${(gzipBytes / 1024).toFixed(1)} KiB gzip`);
console.log(`Verified ${dynamicRoutes.length} on-demand route chunks and the compiled server artifact`);
console.log(`Verified ${requiredMetadata.length} discovery/social metadata fields and the public favicon`);
