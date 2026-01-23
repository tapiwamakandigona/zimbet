import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const index = path.join(distDir, 'index.html');
const fourOhFour = path.join(distDir, '404.html');

try {
    if (fs.existsSync(index)) {
        fs.copyFileSync(index, fourOhFour);
        console.log('✅ Copied index.html to 404.html');
    } else {
        console.warn('⚠️ index.html not found, skipping 404.html creation');
    }
} catch (e) {
    console.error('❌ Failed to copy to 404.html', e);
    process.exit(1);
}
