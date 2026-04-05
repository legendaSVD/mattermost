import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T483 triggers notification with uppercase channel-wide mention and highlights message for all users',
    {tag: '@notifications'},
    async ({pw, headless, browserName}) => {
        test.skip(
            headless && browserName !== 'firefox',
            'Works across browsers and devices, except in headless mode, where stubbing the Notification API is supported only in Firefox and WebKit.',
        );
        const {team, adminUser, user} = await pw.initSetup();
        const {page: adminPage, channelsPage: adminChannelsPage} = await pw.testBrowser.login(adminUser);
        await adminChannelsPage.goto(team.name, 'town-square');
        await adminChannelsPage.toBeVisible();
        await pw.stubNotification(adminPage, 'granted');
        const {channelsPage: otherChannelsPage} = await pw.testBrowser.login(user);
        await otherChannelsPage.goto(team.name, 'off-topic');
        await otherChannelsPage.toBeVisible();
        const message = `@ALL good morning, ${team.name}!`;
        await otherChannelsPage.postMessage(message);
        const notifications = await pw.waitForNotification(adminPage);
        expect(notifications.length).toBe(1);
        const notification = notifications[0];
        expect(notification.title).toBe('Off-Topic');
        expect(notification.body).toBe(`@${user.username}: ${message}`);
        expect(notification.tag).toBe(`@${user.username}: ${message}`);
        expect(notification.icon).toContain('.png');
        expect(notification.requireInteraction).toBe(false);
        expect(notification.silent).toBe(false);
        const otherLastPost = await otherChannelsPage.getLastPost();
        await otherLastPost.toContainText(message);
        await expect(otherLastPost.container.locator('.mention--highlight')).toBeVisible();
        await expect(otherLastPost.container.locator('.mention--highlight').getByText('@ALL')).toBeVisible();
        await adminChannelsPage.goto(team.name, 'off-topic');
        const adminLastPost = await adminChannelsPage.getLastPost();
        await adminLastPost.toContainText(message);
        await expect(adminLastPost.container.locator('.mention--highlight')).toBeVisible();
        await expect(adminLastPost.container.locator('.mention--highlight').getByText('@ALL')).toBeVisible();
    },
);