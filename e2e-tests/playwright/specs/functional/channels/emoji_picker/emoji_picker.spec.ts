import {Locator} from '@playwright/test';
import {expect, test} from '@mattermost/playwright-lib';
test(
    'Should add emoji to post textbox correctly and handle focus/selection correctly',
    {tag: '@emoji_picker'},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {channelsPage} = await pw.testBrowser.login(user);
        const {emojiGifPickerPopup} = channelsPage;
        const {postCreate} = channelsPage.centerView;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await postCreate.openEmojiPicker();
        await emojiGifPickerPopup.toBeVisible();
        await emojiGifPickerPopup.clickEmoji('slightly smiling face');
        await emojiGifPickerPopup.notToBeVisible();
        await expectPostCreateState(postCreate.input, '🙂 ', '');
        await postCreate.openEmojiPicker();
        await emojiGifPickerPopup.clickEmoji('upside down face');
        await expectPostCreateState(postCreate.input, '🙂 🙃 ', '');
        await postCreate.writeMessage('ab');
        await postCreate.input.press('ArrowLeft');
        await expectPostCreateState(postCreate.input, 'a', 'b');
        await postCreate.openEmojiPicker();
        await emojiGifPickerPopup.clickEmoji('face with raised eyebrow');
        await expectPostCreateState(postCreate.input, 'a 🤨 ', 'b');
        await postCreate.writeMessage('this is a test');
        await postCreate.input.press('ArrowLeft');
        await postCreate.input.press('ArrowLeft');
        await postCreate.input.press('ArrowLeft');
        await postCreate.input.press('ArrowLeft');
        await expectPostCreateState(postCreate.input, 'this is a ', 'test');
        await postCreate.openEmojiPicker();
        await emojiGifPickerPopup.clickEmoji('neutral face');
        await expectPostCreateState(postCreate.input, 'this is a 😐 ', 'test');
    },
);
async function expectPostCreateState(input: Locator, textBeforeCaret: string, textAfterCaret: string) {
    await expect(input).toBeFocused();
    await expect(input).toHaveValue(textBeforeCaret + textAfterCaret);
    const selectionStart = await input.evaluate((element: HTMLTextAreaElement) => element.selectionStart);
    expect(selectionStart).toEqual(textBeforeCaret.length);
    const selectionEnd = await input.evaluate((element: HTMLTextAreaElement) => element.selectionEnd);
    expect(selectionEnd).toEqual(textBeforeCaret.length);
}