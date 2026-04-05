import {expect, koreanTestPhrase, test, typeKoreanWithIme} from '@mattermost/playwright-lib';
test('Search box handles Korean IME correctly', async ({pw, browserName}) => {
    test.skip(browserName !== 'chromium', 'The API used to test this is only available in Chrome');
    const {userClient, user, team} = await pw.initSetup();
    const testChannel = pw.random.channel({
        teamId: team.id,
        name: 'korean-test-channel',
        displayName: koreanTestPhrase,
    });
    await userClient.createChannel(testChannel);
    const {channelsPage, page} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.openSearch();
    const {searchInput} = channelsPage.searchBox;
    await searchInput.focus();
    const searchText = 'in:' + koreanTestPhrase.substring(0, 3);
    await typeKoreanWithIme(page, searchText);
    await expect(searchInput).toHaveValue(searchText);
    await expect(channelsPage.searchBox.selectedSuggestion).toBeVisible();
    await expect(channelsPage.searchBox.selectedSuggestion).toHaveText(testChannel.display_name);
});