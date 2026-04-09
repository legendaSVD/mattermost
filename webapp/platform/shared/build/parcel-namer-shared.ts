import * as path from 'node:path';
import {Namer} from '@parcel/plugin';
import type {FilePath} from '@parcel/types';
export default new Namer({
    async name(opts): Promise<FilePath | null | undefined> {
        const {bundle} = opts;
        const mainEntry = bundle.getMainEntry();
        if (!mainEntry) {
            return null;
        }
        const relativeDir = path.posix.relative('./src', path.dirname(mainEntry.filePath));
        let filename;
        if (bundle.type === 'js') {
            filename = path.basename(mainEntry.filePath, path.extname(mainEntry.filePath));
            filename += '.' + bundle.target.name + '.js';
        } else if (bundle.type === 'ts') {
            filename = path.basename(mainEntry.filePath, path.extname(mainEntry.filePath)) + '.d.ts';
        } else {
            filename = bundle.target.name + path.extname(mainEntry.filePath);
        }
        const newPath = path.posix.join(relativeDir, filename);
        return newPath;
    },
});