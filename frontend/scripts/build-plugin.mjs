/**
 * Build ContentAI plugin ZIP for distribution
 * Usage: node scripts/build-plugin.mjs
 *
 * Creates contentai-plugin.zip from WordPress plugin folder
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = '/Applications/XAMPP/xamppfiles/htdocs/wordpress/wp-content/plugins/contentai-plugin';
const OUTPUT_ZIP = join(__dirname, '../public/plugin.zip');

// Files/folders to exclude from ZIP
const EXCLUDE = ['.git', '.gitignore', 'node_modules', 'package.json', 'package-lock.json', 'vite.config.js', 'CLAUDE.md', 'docker-compose.yml', 'src'];

function buildPlugin() {
  console.log('🔧 Building ContentAI plugin ZIP...\n');

  // 1. Check required files
  try {
    execSync(`test -e "${PLUGIN_DIR}/contentai.php" && test -e "${PLUGIN_DIR}/dist"`, { stdio: 'pipe' });
  } catch {
    console.error('❌ Missing required plugin files');
    process.exit(1);
  }
  console.log('✅ Plugin files found');

  // 2. Build frontend if needed
  try {
    execSync(`cd "${PLUGIN_DIR}" && npm run build`, { stdio: 'inherit' });
    console.log('✅ Frontend built');
  } catch {
    console.log('⚠️  Frontend build skipped');
  }

  // 3. Use rsync to copy excluding unwanted files
  const tempDir = join(__dirname, '../temp-plugin');
  execSync(`rm -rf "${tempDir}" && mkdir -p "${tempDir}"`, { stdio: 'pipe' });

  const excludeFlags = EXCLUDE.map(e => `--exclude="${e}"`).join(' ');
  execSync(`rsync -a ${excludeFlags} "${PLUGIN_DIR}/" "${tempDir}/"`, { stdio: 'pipe' });
  console.log('✅ Files copied');

  // 4. Create ZIP (cd into tempDir so zip root is the plugin folder)
  execSync(`cd "${tempDir}" && zip -r "${OUTPUT_ZIP}" .`, { stdio: 'pipe' });

  // 5. Cleanup
  execSync(`rm -rf "${tempDir}"`, { stdio: 'pipe' });

  const size = (readFileSync(OUTPUT_ZIP).length / 1024).toFixed(1);
  console.log(`\n✅ Done! Plugin saved to: ${OUTPUT_ZIP}`);
  console.log(`   Size: ${size} KB`);
}

buildPlugin();