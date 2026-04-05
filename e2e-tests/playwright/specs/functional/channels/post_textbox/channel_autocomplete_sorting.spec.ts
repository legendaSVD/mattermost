import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-67953 channel mention autocomplete prioritizes DisplayName matches in Other Channels',
    {tag: ['@mentions']},
    async ({pw}) => {
        const {team, user, adminClient} = await pw.initSetup();
        await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-gamma-conversation-' + Date.now(),
            display_name: 'Gamma: Conversation',
            type: 'O',
        });
        await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-gamma-logs-' + Date.now(),
            display_name: 'Gamma: Logs',
            type: 'O',
        });
        await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-alpha-channel-' + Date.now(),
            display_name: 'Alpha Channel',
            type: 'O',
            purpose: 'alpha release of gamma',
        });
        await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-beta-channel-' + Date.now(),
            display_name: 'Beta Channel',
            type: 'O',
            purpose: 'beta release of gamma',
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.centerView.postCreate.writeMessage('~gamma');
        const suggestionList = channelsPage.centerView.postCreate.suggestionList;
        await expect(suggestionList).toBeVisible();
        const otherChannelsGroup = suggestionList.getByRole('group', {name: 'Other Channels'});
        await expect(otherChannelsGroup).toBeVisible();
        const suggestions = otherChannelsGroup.getByRole('option');
        await expect(suggestions).toHaveCount(4);
        await expect(suggestions.nth(0)).toContainText('Gamma: Conversation');
        await expect(suggestions.nth(1)).toContainText('Gamma: Logs');
        await expect(suggestions.nth(2)).toContainText('Alpha Channel');
        await expect(suggestions.nth(3)).toContainText('Beta Channel');
    },
);