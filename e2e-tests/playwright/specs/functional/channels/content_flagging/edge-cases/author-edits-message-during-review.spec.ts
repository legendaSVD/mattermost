import {test} from '@mattermost/playwright-lib';
import {createPost, verifyAuthorNotification, setupContentFlagging} from './../support';
test("Verify Post message is updated for the reviewer, if author updates the post before reviewer's action ", async ({
    pw,
}) => {
    const {adminClient, team, user, userClient, adminUser} = await pw.initSetup();
    const secondUser = await pw.random.user('reviewer');
    const {id: secondUserID} = await adminClient.createUser(secondUser, '', '');
    await adminClient.addToTeam(team.id, secondUserID);
    await setupContentFlagging(adminClient, [adminUser.id, secondUserID], true, false);
    const message = `Post by @${user.username}, is flagged once`;
    const {post} = await createPost(adminClient, userClient, team, user, message);
    await adminClient.flagPost(post.id, 'Classification mismatch', 'This message is inappropriate');
    let updatedMessage = `${message} - Edited during review`;
    await userClient.updatePost({
        id: post.id,
        create_at: post.create_at,
        update_at: Date.now(),
        edit_at: 0,
        delete_at: 0,
        is_pinned: false,
        user_id: post.user_id,
        channel_id: post.channel_id,
        root_id: '',
        original_id: '',
        message: updatedMessage,
        type: '',
        props: {},
        hashtags: '',
        file_ids: [],
        pending_post_id: '',
        remote_id: '',
        reply_count: 0,
        last_reply_at: 0,
        participants: null,
        metadata: post.metadata,
    });
    const {channelsPage: secondChannelsPage, contentReviewPage: secondContentReviewPage} =
        await pw.testBrowser.login(secondUser);
    updatedMessage = `${updatedMessage} Edited`;
    await verifyAuthorNotification(
        post.id,
        secondChannelsPage,
        secondContentReviewPage,
        team.name,
        updatedMessage,
        'Pending',
    );
});