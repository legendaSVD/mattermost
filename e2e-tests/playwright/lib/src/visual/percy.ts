import percySnapshot from '@percy/playwright';
import {testConfig} from '@/test_config';
import {TestArgs} from '@/types';
export default async function snapshotWithPercy(name: string, testArgs: TestArgs) {
    if (testArgs.browserName === 'chromium' && testConfig.percyEnabled && testArgs.viewport) {
        const {page, viewport} = testArgs;
        try {
            await percySnapshot(page, name, {widths: [viewport.width], minHeight: viewport.height});
        } catch (error) {
            console.log(`${error}\nIn addition, check if token is properly set by "export PERCY_TOKEN=<change_me>"`);
        }
    }
}