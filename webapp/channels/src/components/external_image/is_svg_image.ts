import type {PostImage} from '@mattermost/types/posts';
export const isSVGImage = (imageMetadata: PostImage | undefined, src: string) => {
    if (!imageMetadata) {
        return src.indexOf('.svg') !== -1;
    }
    return imageMetadata.format === 'svg';
};