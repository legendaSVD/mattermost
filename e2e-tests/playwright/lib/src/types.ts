import {Locator, Page, ViewportSize} from '@playwright/test';
export type TestArgs = {
    page: Page;
    locator?: Locator;
    browserName: string;
    viewport?: ViewportSize | null;
};
export type ScreenshotOptions = {
    animations?: 'disabled' | 'allow';
    caret?: 'hide' | 'initial';
    clip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    fullPage?: boolean;
    mask?: Array<Locator>;
    maskColor?: string;
    maxDiffPixelRatio?: number;
    maxDiffPixels?: number;
    omitBackground?: boolean;
    scale?: 'css' | 'device';
    threshold?: number;
    timeout?: number;
};