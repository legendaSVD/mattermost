import {expect, test} from '@mattermost/playwright-lib';
test('displays multiple mentions correctly in Recent Mentions panel', {tag: ['@smoke', '@mentions']}, async ({pw}) => {
    const MENTION_COUNT = 20;
    const {team, user: mentioningUser, userClient} = await pw.initSetup({userOptions: {prefix: 'mentioner'}});
    const {adminClient} = await pw.getAdminClient();
    const mentionedUser = await pw.random.user('mentioned');
    const {id: mentionedUserID} = await adminClient.createUser(mentionedUser, '', '');
    await adminClient.addToTeam(team.id, mentionedUserID);
    const channels = await userClient.getMyChannels(team.id);
    const townSquare = channels.find((channel) => channel.name === 'town-square');
    if (!townSquare) {
        throw new Error('Town Square channel not found');
    }
    for (let i = 0; i < MENTION_COUNT; i++) {
        const message = `Hey @${mentionedUser.username}, this is mention #${i + 1}`;
        await userClient.createPost({
            channel_id: townSquare.id,
            message,
            user_id: mentioningUser.id,
        });
    }
    const {page: mentionedPage, channelsPage: mentionedChannelsPage} = await pw.testBrowser.login(mentionedUser);
    await mentionedChannelsPage.goto(team.name, 'town-square');
    await mentionedChannelsPage.toBeVisible();
    await mentionedPage.getByRole('button', {name: 'Recent mentions'}).click();
    await mentionedChannelsPage.sidebarRight.toBeVisible();
    const mentionPosts = mentionedChannelsPage.sidebarRight.container.locator('.post');
    await expect(mentionPosts).toHaveCount(MENTION_COUNT);
    for (let i = 0; i < MENTION_COUNT; i++) {
        const mentionNumber = MENTION_COUNT - i;
        const expectedText = `Hey @${mentionedUser.username}, this is mention #${mentionNumber}`;
        await expect(mentionPosts.nth(i)).toContainText(expectedText);
    }
});