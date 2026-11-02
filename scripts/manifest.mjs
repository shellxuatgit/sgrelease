// The build record: size + sha512 of every file this run produced.
//
// Lives in this repository (not in the private one) so the build that runs here
// also writes its own manifest. Local publishing reads it back out of R2 to
// decide what to promote.
import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

function arg(name, fallback = '') {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const version = arg('version');
const platform = arg('platform');
const dir = arg('dir', 'out');
const out = arg('out', join(dir, 'manifest.json'));
const commit = arg('commit', process.env.SOURCE_SHA ?? '');
const host = arg('host', 'dl.salesgraph.dev');

if (!version || !platform) {
  console.error('usage: manifest.mjs --version 1.0.3 --platform win|mac --dir out [--commit sha]');
  process.exit(2);
}

async function sha512Of(path) {
  const hash = createHash('sha512');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('base64');
}

const files = [];
for (const name of readdirSync(dir).sort()) {
  if (name === basename(out)) continue;
  const path = join(dir, name);
  const stat = statSync(path);
  if (!stat.isFile()) continue;
  files.push({
    name,
    size: stat.size,
    sha512: await sha512Of(path),
    url: `https://${host}/${platform}/${version}/${name}`,
  });
}

const manifest = {
  version,
  platform,
  commit: commit || 'unknown',
  nodeVersion: process.version,
  recordedAt: new Date().toISOString(),
  files,
};
writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${platform} ${version}: ${files.length} file(s), commit ${manifest.commit.slice(0, 7)}`);
for (const f of files) console.log(`  ${f.name}  ${f.size} bytes  ${f.sha512.slice(0, 16)}...`);
