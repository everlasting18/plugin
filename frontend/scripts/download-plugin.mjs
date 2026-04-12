/**
 * Build plugin ZIP for download
 * Run: node scripts/download-plugin.mjs
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pluginDir = resolve(root, '../wp-content/plugins/contentai-plugin');
const outputPath = resolve(root, 'public/plugin.zip');

// Build frontend first
console.log('Building frontend...');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

// Create plugin zip
const distDir = resolve(pluginDir, 'dist');
if (!existsSync(distDir)) {
  console.error('Plugin dist/ not found. Run npm run build in plugin first.');
  process.exit(1);
}

console.log('Creating plugin ZIP...');
execSync(`zip -r "${outputPath}" . -x "node_modules/*" -x "dist/node_modules/*" -x "*.git*" -x "*.log"`, {
  cwd: pluginDir,
  stdio: 'inherit',
});

console.log('Done! Plugin ZIP:', outputPath);
