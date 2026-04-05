import os from 'node:os';
import chalk from 'chalk';
import {TestInfo, expect} from '@playwright/test';
import snapshotWithPercy from './percy';
import {duration, illegalRe, wait} from '@/util';
import {testConfig} from '@/test_config';
import {ScreenshotOptions, TestArgs} from '@/types';
export async function matchSnapshot(testInfo: TestInfo, testArgs: TestArgs, options: ScreenshotOptions = {}) {
    if (os.platform() !== 'linux') {
        console.log(
            chalk.yellow(
                `^ Warning: No visual test performed. Run in Linux or Playwright docker image to match snapshot.`,
            ),
        );
        return;
    }
    if (testConfig.snapshotEnabled || testConfig.percyEnabled) {
        await testArgs.page.waitForLoadState('networkidle');
        await testArgs.page.waitForLoadState('domcontentloaded');
        await wait(duration.one_sec);
    }
    if (testConfig.snapshotEnabled) {
        const filename = testInfo.title.trim().replace(illegalRe, '').replace(/\s/g, '-').trim().toLowerCase();
        if (testArgs.locator) {
            await expect(testArgs.locator).toHaveScreenshot(`${filename}.png`, {...options});
        } else {
            await expect(testArgs.page).toHaveScreenshot(`${filename}.png`, {fullPage: true, ...options});
        }
    }
    if (testConfig.percyEnabled) {
        const name = `[${testInfo.project.name}, ${testArgs?.viewport?.width}px] > ${testInfo.file} > ${testInfo.title}`;
        await snapshotWithPercy(name, testArgs);
    }
}