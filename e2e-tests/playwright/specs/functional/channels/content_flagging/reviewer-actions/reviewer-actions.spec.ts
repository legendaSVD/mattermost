import {test} from '@mattermost/playwright-lib';
import {setupContentFlagging, createPost, verifyAuthorNotification} from './../support';
test('Verify Removed Flagged posts show appropriate status and do not show the post message', async ({pw}) => {
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
    const commentRemove = 'Removing this message as it violates the guidelines.';
    const contentModerationMessage = 'Content deleted as part of Content Flagging review process';
    await secondContentReviewPage.setReportCardByPostID(post.id);
    await secondContentReviewPage.openViewDetails();
    await secondContentReviewPage.waitForRHSVisible();
    await secondContentReviewPage.openViewDetails();
    await secondContentReviewPage.clickRemoveMessage();
    await secondContentReviewPage.enterConfirmationComment(commentRemove);
    await secondContentReviewPage.confirmRemove();
    const {channelsPage: channelsPageThird, contentReviewPage: contentReviewPageThird} =
        await pw.testBrowser.login(thirdUser);
    await verifyAuthorNotification(
        post.id,
        channelsPageThird,
        contentReviewPageThird,
        team.name,
        contentModerationMessage,
        'Removed',
    );
});