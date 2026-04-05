import {expect, test} from '@mattermost/playwright-lib';
test.fixme(
    'MM-T5445 searches for GIF from center textbox and posts selected GIF correctly',
    {tag: '@gif_picker'},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.centerView.postCreate.openEmojiPicker();
        await channelsPage.emojiGifPickerPopup.toBeVisible();
        await channelsPage.emojiGifPickerPopup.openGifTab();
        await channelsPage.emojiGifPickerPopup.searchGif('hello');
        const {img: firstSearchGifResult, alt: altOfFirstSearchGifResult} =
            await channelsPage.emojiGifPickerPopup.getNthGif(0);
        await firstSearchGifResult.click();
        await channelsPage.centerView.postCreate.sendMessage();
        const lastPost = await channelsPage.getLastPost();
        await lastPost.toBeVisible();
        await expect(lastPost.body.getByLabel('file thumbnail')).toHaveAttribute('alt', altOfFirstSearchGifResult);
    },
);
test.fixme(
    'MM-T5446 searches for GIF from RHS textbox and posts selected GIF correctly in thread',
    {tag: '@gif_picker'},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.postMessage('Message to open RHS');
        const lastPost = await channelsPage.getLastPost();
        await lastPost.hover();
        await lastPost.postMenu.toBeVisible();
        await lastPost.postMenu.reply();
        const sidebarRight = channelsPage.sidebarRight;
        await sidebarRight.toBeVisible();
        await sidebarRight.postCreate.toBeVisible();
        await sidebarRight.postCreate.writeMessage('Replying to a thread');
        await sidebarRight.postCreate.sendMessage();
        await sidebarRight.postCreate.openEmojiPicker();
        await channelsPage.emojiGifPickerPopup.toBeVisible();
        await channelsPage.emojiGifPickerPopup.openGifTab();
        await channelsPage.emojiGifPickerPopup.searchGif('hello');
        const {img: firstSearchGifResult, alt: altOfFirstSearchGifResult} =
            await channelsPage.emojiGifPickerPopup.getNthGif(0);
        await firstSearchGifResult.click();
        await sidebarRight.postCreate.sendMessage();
        const lastPostInRHS = await sidebarRight.getLastPost();
        await lastPostInRHS.toBeVisible();
        await expect(lastPostInRHS.body.getByLabel('file thumbnail')).toHaveAttribute('alt', altOfFirstSearchGifResult);
    },
);