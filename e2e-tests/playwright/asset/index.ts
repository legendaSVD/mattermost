import fs from 'fs';
import path from 'path';
const availableAssets = fs.readdirSync(__dirname).filter((file) => !file.endsWith('.ts'));
export function getAsset(filename: string): string {
    if (!availableAssets.includes(filename)) {
        throw new Error(`Asset "${filename}" not found. Available: ${availableAssets.join(', ')}`);
    }
    return path.join(__dirname, filename);
}