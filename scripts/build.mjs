import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * A tiny cross-platform task wrapper.
 *
 * Some Windows setups lock esbuild's temporary directory between the transform
 * and cleanup phases (antivirus / Defender file locks). Pointing TEMP/TMP at a
 * local directory inside the project avoids that platform-specific failure and
 * keeps CI and local builds deterministic.
 */
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = resolve(projectRoot, '.tmp');
mkdirSync(tempDir, { recursive: true });

const env = {
  ...process.env,
  TEMP: tempDir,
  TMP: tempDir
};

const run = (scriptPath, args) => {
  const result = spawnSync(process.execPath, [resolve(projectRoot, scriptPath), ...args], {
    cwd: projectRoot,
    env,
    stdio: 'inherit'
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if ((result.status ?? 0) !== 0) {
    process.exit(result.status ?? 1);
  }
};

const mode = process.argv[2] ?? 'build';

if (mode === 'dev') {
  run('node_modules/vite/bin/vite.js', ['--host', '127.0.0.1']);
} else {
  run('node_modules/typescript/bin/tsc', ['--noEmit']);
  run('node_modules/vite/bin/vite.js', ['build']);
}
