import path from 'node:path';
import fs from 'node:fs';
let uuidv4: (() => string) | null = null;
async function loadUuid() {
    if (!uuidv4) {
        const {v4} = await import('uuid');
        uuidv4 = v4;
    }
    return uuidv4!;
}
const second = 1000;
const minute = 60 * 1000;
export const duration = {
    half_sec: second / 2,
    one_sec: second,
    two_sec: second * 2,
    four_sec: second * 4,
    ten_sec: second * 10,
    half_min: minute / 2,
    one_min: minute,
    two_min: minute * 2,
    four_min: minute * 4,
};
export const wait = async (ms = 0): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
export async function getRandomId(length = 7): Promise<string> {
    const MAX_SUBSTRING_INDEX = 27;
    const v4 = await loadUuid();
    return v4()
        .replace(/-/g, '')
        .substring(MAX_SUBSTRING_INDEX - length, MAX_SUBSTRING_INDEX);
}
export const defaultTeam = {name: 'ad-1', displayName: 'eligendi', type: 'O'};
export const illegalRe = /[/?<>\\:*|":&();]/g;
export const simpleEmailRe = /\S+@\S+\.\S+/;
export function hexToRgb(hex: string): string {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
}
export function findPlaywrightRoot(): string | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;
    while (currentDir !== root) {
        const e2eTestsPath = path.join(currentDir, 'e2e-tests');
        const e2eTestsConfigPath = path.join(e2eTestsPath, 'playwright.config.ts');
        if (fs.existsSync(e2eTestsConfigPath)) {
            return e2eTestsPath;
        }
        const e2ePlaywrightPath = path.join(currentDir, 'e2e-tests', 'playwright');
        const e2ePlaywrightConfigPath = path.join(e2ePlaywrightPath, 'playwright.config.ts');
        if (fs.existsSync(e2ePlaywrightConfigPath)) {
            return e2ePlaywrightPath;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}
export function resolvePlaywrightPath(dir: string): string {
    const playwrightRoot = findPlaywrightRoot();
    if (playwrightRoot) {
        return path.join(playwrightRoot, dir);
    }
    return path.join(process.cwd(), dir);
}