import {test} from '@mattermost/playwright-lib';
import {setupContentFlagging, createPost, verifyAuthorNotification} from './../support';
test('Verify multiple reviewers receive same flagged post', async ({pw}) => {
    const {adminClient, team, user, userClient, adminUser} = await pw.initSetup();
    const secondUser = await pw.random.user('reviewer');
    const {id: secondUserID} = await adminClient.createUser(secondUser, '', '');
    await adminClient.addToTeam(team.id, secondUserID);
    const thirdUser = await pw.random.user('reviewer');
    const {id: thirdUserID} = await adminClient.createUser(thirdUser, '', '');
    await adminClient.addToTeam(team.id, thirdUserID);
    await setupContentFlagging(adminClient, [adminUser.id, secondUserID, thirdUserID]);
    const message = `Post by @${user.username}, is flagged once`;
    const {post} = await createPost(adminClient, userClient, team, user, message);
    await adminClient.flagPost(post.id, 'Classification mismatch', 'This message is inappropriate');
    const {channelsPage: secondChannelsPage, contentReviewPage: secondContentReviewPage} =
        await pw.testBrowser.login(secondUser);
    await verifyAuthorNotification(post.id, secondChannelsPage, secondContentReviewPage, team.name, message, 'Pending');
    const {channelsPage: channelsPageThird, contentReviewPage: contentReviewPageThird} =
        await pw.testBrowser.login(thirdUser);
    await verifyAuthorNotification(post.id, channelsPageThird, contentReviewPageThird, team.name, message, 'Pending');
});