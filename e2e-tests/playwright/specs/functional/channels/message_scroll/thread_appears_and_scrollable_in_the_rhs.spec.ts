import {CollapsedThreads} from '@mattermost/types/config';
import {expect, test} from '@mattermost/playwright-lib';
test('MM-T3293 The entire thread appears in the RHS (scrollable)', {tag: ['@messaging']}, async ({pw}) => {
    const NUMBER_OF_REPLIES = 100;
    const NUMBER_OF_MAIN_THREAD_MESSAGES = 40;
    const {team, user: mainUser, userClient} = await pw.initSetup();
    const {adminClient} = await pw.getAdminClient();
    await adminClient.patchConfig({ServiceSettings: {CollapsedThreads: CollapsedThreads.DISABLED}});
    const otherUser = await pw.random.user('other');
    const createdOtherUser = await adminClient.createUser(otherUser, '', '');
    otherUser.id = createdOtherUser.id;
    await adminClient.addToTeam(team.id, otherUser.id);
    const channels = await userClient.getMyChannels(team.id);
    const townSquare = channels.find((channel) => channel.name === 'town-square');
    if (!townSquare) {
        throw new Error('Town Square channel not found');
    }
    const firstPost = await userClient.createPost({
        channel_id: townSquare.id,
        message: 'First message',
        user_id: mainUser.id,
    });
    const replies: string[] = [];
    for (let i = 1; i <= NUMBER_OF_REPLIES; i++) {
        const replyMessage = `Reply number ${i}`;
        await userClient.createPost({
            channel_id: townSquare.id,
            message: replyMessage,
            user_id: mainUser.id,
            root_id: firstPost.id,
        });
        replies.push(replyMessage);
    }
    for (let i = 1; i <= NUMBER_OF_MAIN_THREAD_MESSAGES; i++) {
        await adminClient.createPost({
            channel_id: townSquare.id,
            message: `Other message ${i}`,
            user_id: otherUser.id,
        });
    }
    const lastReplyMessage = 'Last Reply';
    const lastReply = await userClient.createPost({
        channel_id: townSquare.id,
        message: lastReplyMessage,
        user_id: mainUser.id,
        root_id: firstPost.id,
    });
    const {channelsPage} = await pw.testBrowser.login(mainUser);
    await channelsPage.goto(team.name, 'town-square');
    await channelsPage.toBeVisible();
    const postWithReply = await channelsPage.centerView.getPostById(lastReply.id);
    await postWithReply.reply();
    await channelsPage.sidebarRight.toBeVisible();
    await expect(channelsPage.sidebarRight.container.getByText(lastReplyMessage)).toBeVisible();
    const rhsContainer = channelsPage.sidebarRight.container;
    for (let i = replies.length - 1; i >= 0; i--) {
        const replyText = replies[i];
        const replyElement = rhsContainer.getByText(replyText, {exact: true});
        await replyElement.scrollIntoViewIfNeeded();
        await expect(replyElement).toBeVisible();
    }
    await expect(rhsContainer.getByText('First message')).toBeVisible();
});