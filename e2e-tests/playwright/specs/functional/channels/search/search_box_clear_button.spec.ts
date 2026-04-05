import {expect, test} from '@mattermost/playwright-lib';
test('MM-64155 search box clear button should not leave type badge after closing the search box', async ({pw}) => {
    const {user} = await pw.initSetup();
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.openSearch();
    const searchText = 'abcdef';
    const {searchInput} = channelsPage.searchBox;
    await searchInput.pressSequentially(searchText);
    await expect(searchInput).toHaveValue(searchText);
    await channelsPage.searchBox.clearIfPossible();
    await expect(searchInput).toHaveValue('');
    await channelsPage.page.click('body', {position: {x: 0, y: 0}});
    await expect(channelsPage.searchBox.container).not.toBeVisible();
    const searchTypeBadge = channelsPage.page.getByTestId('searchTypeBadge');
    await expect(searchTypeBadge).not.toBeVisible();
});