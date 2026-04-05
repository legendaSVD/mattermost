import {expect, test} from '@mattermost/playwright-lib';
test('team selector should not be visible if user belongs to only one team', async ({pw}) => {
    const {adminClient, user, team} = await pw.initSetup();
    const channel = await adminClient.createChannel(
        pw.random.channel({
            teamId: team.id,
            displayName: 'Test Channel',
            name: 'test-channel',
        }),
    );
    const message = 'test message for search';
    await adminClient.createPost({
        channel_id: channel.id,
        message,
    });
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name);
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.openSearch();
    const page = channelsPage.page;
    await expect(page.locator('#searchBox')).toBeVisible();
    await expect(page.getByTestId('searchTeamSelector')).not.toBeVisible();
    await page.locator('#searchBox input').fill(message);
    await page.keyboard.press('Enter');
    await expect(page.locator('#searchContainer')).toBeVisible();
    await expect(page.locator('.team-selector-container')).not.toBeVisible();
});
test('team selector should be visible if user belongs to multiple teams', async ({pw}) => {
    const {adminClient, user, team} = await pw.initSetup();
    const secondTeam = await adminClient.createTeam(await pw.random.team('team', 'Team', 'O', true));
    await adminClient.addUsersToTeam(secondTeam.id, [user.id]);
    const channel = await adminClient.createChannel(
        pw.random.channel({
            teamId: team.id,
            displayName: 'Test Channel',
            name: 'test-channel-multi',
        }),
    );
    const message = 'test message for multiple teams search';
    await adminClient.createPost({
        channel_id: channel.id,
        message,
    });
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name);
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.openSearch();
    const page = channelsPage.page;
    await expect(page.locator('#searchBox')).toBeVisible();
    await expect(page.getByTestId('searchTeamSelector')).toBeVisible();
    await page.getByTestId('searchTeamsSelectorMenuButton').click();
    const teamSelector = page.getByRole('menu', {name: 'Select team'});
    await expect(teamSelector).toBeVisible();
    await expect(teamSelector.getByText(team.display_name)).toBeVisible();
    await expect(teamSelector.getByText(secondTeam.display_name)).toBeVisible();
    await expect(teamSelector.getByText('All teams')).toBeVisible();
    await page.click('body', {position: {x: 0, y: 0}});
    await page.locator('#searchBox input').fill(message);
    await page.keyboard.press('Enter');
    await expect(page.locator('#searchContainer')).toBeVisible();
    await expect(page.locator('.team-selector-container')).toBeVisible();
    await page.locator('.team-selector-container .search-teams-selector-menu-button').click();
    const resultsTeamSelector = page.getByRole('menu', {name: 'Select team'});
    await expect(resultsTeamSelector).toBeVisible();
    await expect(resultsTeamSelector.getByText(team.display_name)).toBeVisible();
    await expect(resultsTeamSelector.getByText(secondTeam.display_name)).toBeVisible();
    await expect(resultsTeamSelector.getByText('All teams')).toBeVisible();
});
test('team selector should show filter input with more than 4 teams', async ({pw}) => {
    const {adminClient, user, team} = await pw.initSetup();
    const teams = [team];
    for (let i = 0; i < 4; i++) {
        const newTeam = await adminClient.createTeam(await pw.random.team('team', 'Team', 'O', true));
        await adminClient.addUsersToTeam(newTeam.id, [user.id]);
        teams.push(newTeam);
    }
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto(team.name);
    await channelsPage.toBeVisible();
    await channelsPage.globalHeader.openSearch();
    const page = channelsPage.page;
    await expect(page.getByTestId('searchTeamSelector')).toBeVisible();
    await page.getByTestId('searchTeamsSelectorMenuButton').click();
    const teamSelector = page.getByRole('menu', {name: 'Select team'});
    await expect(teamSelector).toBeVisible();
    await expect(teamSelector.getByLabel('Search teams')).toBeVisible();
    for (const t of teams) {
        await expect(teamSelector.getByText(t.display_name)).toBeVisible();
    }
    await teamSelector.getByLabel('Search teams').fill(teams[2].display_name);
    await expect(teamSelector.getByText(teams[0].display_name)).toBeVisible();
    await expect(teamSelector.getByText(teams[2].display_name)).toBeVisible();
    for (let i = 1; i < teams.length; i++) {
        if (i !== 2) {
            await expect(teamSelector.getByText(teams[i].display_name)).not.toBeVisible();
        }
    }
    await teamSelector.getByLabel('Search teams').fill('');
    for (const t of teams) {
        await expect(teamSelector.getByText(t.display_name)).toBeVisible();
    }
});