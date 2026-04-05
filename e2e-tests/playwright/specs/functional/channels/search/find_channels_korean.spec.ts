import {expect, koreanTestPhrase, test, typeKoreanWithIme} from '@mattermost/playwright-lib';
test('Find Channels modal handles Korean IME input correctly', async ({pw, browserName}) => {
    test.skip(browserName !== 'chromium', 'The API used to test this is only available in Chrome');
    const {adminClient, user, team} = await pw.initSetup();
    const fullMatchChannel = pw.random.channel({
        teamId: team.id,
        name: 'full-match-channel',
        displayName: koreanTestPhrase,
    });
    await adminClient.createChannel(fullMatchChannel);
    const partialMatchChannel = pw.random.channel({
        teamId: team.id,
        name: 'partial-match-channel',
        displayName: koreanTestPhrase.substring(0, 10),
    });
    await adminClient.createChannel(partialMatchChannel);
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.sidebarLeft.findChannelButton.click();
    await channelsPage.findChannelsModal.toBeVisible();
    const input = channelsPage.findChannelsModal.input;
    await input.focus();
    const firstHalf = koreanTestPhrase.substring(0, 5);
    const secondHalf = koreanTestPhrase.substring(5);
    await typeKoreanWithIme(page, firstHalf);
    await expect(input).toHaveValue(firstHalf);
    await expect(page.getByRole('option', {name: fullMatchChannel.display_name, exact: true})).toBeVisible();
    await expect(page.getByRole('option', {name: partialMatchChannel.display_name, exact: true})).toBeVisible();
    await typeKoreanWithIme(page, secondHalf);
    await expect(input).toHaveValue(koreanTestPhrase);
    await expect(page.getByRole('option', {name: fullMatchChannel.display_name, exact: true})).toBeVisible();
    await expect(page.getByRole('option', {name: partialMatchChannel.display_name, exact: true})).not.toBeAttached();
});