// Path resolver for @/ aliases in worker environment
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Resolve @/ paths to apps/web/
export function resolvePath(aliasPath) {
    if (aliasPath.startsWith('@/')) {
        const relativePath = aliasPath.replace('@/', '');
        return resolve(__dirname, '../../apps/web', relativePath);
    }
    return aliasPath;
}
