import path from 'node:path';
import fs from 'node:fs';
import mime from 'mime-types';
import {resolvePlaywrightPath} from './util';
const commonAssetPath = path.resolve(__dirname, 'asset');
export const assetPath = resolvePlaywrightPath('asset');
const availableFiles = ['mattermost-icon_128x128.png'] as const;
type AvailableFilename = (typeof availableFiles)[number];
export function getFileData(filePath: string): File {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
    }
    const mimeType = mime.lookup(filePath) || undefined;
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    return new File([fileBuffer], fileName, {type: mimeType});
}
export function getBlobData(filePath: string): Blob {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
    }
    const mimeType = mime.lookup(filePath) || undefined;
    const fileBuffer = fs.readFileSync(filePath);
    return new Blob([fileBuffer], {type: mimeType});
}
export function getFileFromAsset(filename: string) {
    const filePath = path.join(assetPath, filename);
    return getFileData(filePath);
}
export function getBlobFromAsset(filename: string) {
    const filePath = path.join(assetPath, filename);
    return getBlobData(filePath);
}
export function getFileFromCommonAsset(filename: AvailableFilename) {
    const filePath = path.join(commonAssetPath, filename);
    return getFileData(filePath);
}
export function getBlobFromCommonAsset(filename: AvailableFilename) {
    const filePath = path.join(commonAssetPath, filename);
    return getBlobData(filePath);
}