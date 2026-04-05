import {test, expect} from '@mattermost/playwright-lib';
test('should install and enable demo plugin from URL', async ({pw}) => {
    const {adminClient, user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await adminClient.patchConfig({
        FileSettings: {EnablePublicLink: true},
        ServiceSettings: {
            EnableOnboardingFlow: false,
            EnableTutorial: false,
        },
    });
    await pw.installAndEnablePlugin(
        adminClient,
        'https://github.com/mattermost/mattermost-plugin-demo/releases/download/v0.10.3/mattermost-plugin-demo-v0.10.3.tar.gz',
        'com.mattermost.demo-plugin',
    );
    await expect
        .poll(async () => {
            return await pw.isPluginActive(adminClient, 'com.mattermost.demo-plugin');
        })
        .toBe(true);
    const plugins = await adminClient.getPlugins();
    const demoPlugin = plugins.active.find((p) => p.id === 'com.mattermost.demo-plugin');
    expect(demoPlugin).toBeDefined();
    await channelsPage.page.keyboard.press('Escape');
    await channelsPage.page.waitForTimeout(500);
    await channelsPage.postMessage('/demo_plugin true');
    const post = await channelsPage.getLastPost();
    await post.toBeVisible();
    await post.toContainText('enabled');
});