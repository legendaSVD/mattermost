import {test} from '@mattermost/playwright-lib';
test(
    'MM-67953 Browse Channels modal prioritizes DisplayName matches in search results',
    {tag: ['@browse_channels']},
    async ({pw}) => {
        const {team, user, adminClient} = await pw.initSetup();
        const displayMatchA = await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-gamma-conversation-' + Date.now(),
            display_name: 'Gamma: Conversation',
            type: 'O',
        });
        const displayMatchB = await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-gamma-logs-' + Date.now(),
            display_name: 'Gamma: Logs',
            type: 'O',
        });
        const purposeMatchA = await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-alpha-channel-' + Date.now(),
            display_name: 'Alpha Channel',
            type: 'O',
            purpose: 'alpha release of gamma',
        });
        const purposeMatchB = await adminClient.createChannel({
            team_id: team.id,
            name: 'ac-beta-channel-' + Date.now(),
            display_name: 'Beta Channel',
            type: 'O',
            purpose: 'beta release of gamma',
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const dialog = await channelsPage.openBrowseChannelsModal();
        await dialog.toBeVisible();
        await dialog.fillSearchInput('gamma');
        await dialog.toBeDoneLoading();
        await dialog.toHaveNResults(4);
        await dialog.toHaveChannelAsNthResult(displayMatchA.name, 0);
        await dialog.toHaveChannelAsNthResult(displayMatchB.name, 1);
        await dialog.toHaveChannelAsNthResult(purposeMatchA.name, 2);
        await dialog.toHaveChannelAsNthResult(purposeMatchB.name, 3);
    },
);