import {expect, test} from '@mattermost/playwright-lib';
test(
    'Keyboard shortcuts Shift+Up on center textbox opens the last post in the RHS and correctly focuses the reply textbox',
    {tag: '@keyboard_shortcuts'},
    async ({pw}, testInfo) => {
        const ROOT_MESSAGE = 'The root message for testing Shift+Up keyboard shortcut';
        const NUMBER_OF_REPLIES = 10;
        const ATTACHMENT_FILES = ['mattermost.png', 'sample_text_file.txt', 'archive.zip'];
        test.skip(testInfo.project.name === 'ipad', 'Skipping test on iPad');
        const {adminUser, user, team} = await pw.initSetup();
        const {channelsPage: adminChannelsPage} = await pw.testBrowser.login(adminUser);
        await adminChannelsPage.goto(team.name, 'town-square');
        await adminChannelsPage.toBeVisible();
        await adminChannelsPage.centerView.postCreate.postMessage(ROOT_MESSAGE);
        const rootPost = await adminChannelsPage.getLastPost();
        await rootPost.hover();
        await rootPost.postMenu.toBeVisible();
        await rootPost.postMenu.reply();
        await adminChannelsPage.sidebarRight.toBeVisible();
        for (let i = 1; i <= NUMBER_OF_REPLIES; i++) {
            await adminChannelsPage.sidebarRight.postCreate.postMessage(`Random replies number ${i}`.repeat(40));
        }
        for (const file of ATTACHMENT_FILES) {
            await adminChannelsPage.sidebarRight.postCreate.postMessage(
                `Random replies number with attachment: ${file}`,
                [file],
            );
        }
        await adminChannelsPage.sidebarRight.close();
        const {channelsPage: userChannelsPage, page: userPage} = await pw.testBrowser.login(user);
        await userChannelsPage.goto(team.name, 'town-square');
        await userChannelsPage.toBeVisible();
        await userChannelsPage.centerView.postCreate.input.focus();
        await expect(userChannelsPage.centerView.postCreate.input).toBeFocused();
        await userPage.keyboard.press('Shift+ArrowUp');
        await userChannelsPage.sidebarRight.toBeVisible();
        await userChannelsPage.sidebarRight.toContainText(ROOT_MESSAGE);
        await expect(userChannelsPage.sidebarRight.postCreate.input).toBeFocused();
        await userPage.keyboard.type('Reply typed after Shift+Up');
        const inputValue = await userChannelsPage.sidebarRight.postCreate.getInputValue();
        expect(inputValue).toBe('Reply typed after Shift+Up');
        await userChannelsPage.sidebarRight.postCreate.input.clear();
        await userChannelsPage.sidebarRight.close();
    },
);