import {test as setup} from '@mattermost/playwright-lib';
setup('ensure plugins are loaded', async ({pw}) => {
    await pw.ensurePluginsLoaded();
});
setup('ensure server deployment', async ({pw}) => {
    await pw.ensureServerDeployment();
});