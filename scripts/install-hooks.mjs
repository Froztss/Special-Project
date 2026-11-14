import { chmodSync, copyFileSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(root, 'scripts', 'git-hooks');
const hooksDir = join(root, '.git', 'hooks');

mkdirSync(hooksDir, { recursive: true });

for (const name of readdirSync(sourceDir)) {
  const source = join(sourceDir, name);
  const target = join(hooksDir, name);
  try {
    symlinkSync(relative(hooksDir, source), target, 'file');
  } catch {
    copyFileSync(source, target);
  }
  chmodSync(source, 0o755);
  console.log(`Installed ${name}`);
}