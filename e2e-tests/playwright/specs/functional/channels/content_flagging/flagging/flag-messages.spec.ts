import {expect, test} from '@mattermost/playwright-lib';
const FLAG_REASON_CLASSIFICATION_MISMATCH: string = 'Classification Mismatch';
const FLAG_REASON_CLASSIFICATION_MISMATCH_ALT: string = 'Classification mismatch';
const FLAG_COMMENT: string = 'This message contains misclassified data';
const SYSTEM_MESSAGE = (username: string): string =>
    `The message from @${username} has been quarantined for review. You will be notified once it is reviewed by a Reviewer.`;
async function loginAndNavigate(pw: any, user: any, teamName?: string, channelName?: string): Promise<any> {
    const {channelsPage} = await pw.testBrowser.login(user);
    if (teamName && channelName) {
        await channelsPage.goto(teamName, channelName);
    } else {
        await channelsPage.goto();
    }
    await channelsPage.toBeVisible();
    return channelsPage;
}
async function postMessage(channelsPage: any, message: string): Promise<{post: any; postId: any}> {
    await channelsPage.postMessage(message);
    const post = await channelsPage.getLastPost();
    const postId = await channelsPage.centerView.getLastPostID();
    return {post, postId};
}
async function flagPostFlow(
    post: any,
    channelsPage: any,
    message: string,
    reason: string = FLAG_REASON_CLASSIFICATION_MISMATCH,
    comment: string = FLAG_COMMENT,
): Promise<void> {
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.selectFlagReason(reason);
    await channelsPage.centerView.flagPostConfirmationDialog.fillFlagComment(comment);
    await channelsPage.centerView.flagPostConfirmationDialog.submitButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.notToBeVisible();
}
async function openPostDotMenu(post: any, channelsPage: any): Promise<void> {
    await post.hover();
    await post.postMenu.toBeVisible();
    await post.postMenu.dotMenuButton.click();
    await channelsPage.postDotMenu.toBeVisible();
}
test('Verify flagged message is hidden by default', async ({pw}) => {
    const {user, adminClient} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
        },
    });
    const channelsPage = await loginAndNavigate(pw, user);
    const message = 'This is a test message to be flagged';
    const {post, postId} = await postMessage(channelsPage, message);
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.cancelButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.notToBeVisible();
    await flagPostFlow(post, channelsPage, message, FLAG_REASON_CLASSIFICATION_MISMATCH_ALT);
    const flaggedPost = await channelsPage.centerView.getPostById(postId);
    await flaggedPost.toContainText('(message deleted)');
    const systemMessage = await channelsPage.getLastPost();
    await expect(systemMessage.body).toContainText(SYSTEM_MESSAGE(user.username));
});
test('Verify Post is not hidden after flagging if HideFlaggedContent is false', async ({pw}) => {
    const {user, adminClient} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            AdditionalSettings: {
                HideFlaggedContent: false,
            },
        },
    });
    const channelsPage = await loginAndNavigate(pw, user);
    const message = 'This is a test message to be flagged';
    const {post, postId} = await postMessage(channelsPage, message);
    await post.toBeVisible();
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.cancelButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.notToBeVisible();
    await flagPostFlow(post, channelsPage, message);
    const originaltext = await channelsPage.centerView.getPostById(postId);
    await expect(originaltext.body).toContainText(message);
    const systemMessage = await channelsPage.getLastPost();
    await expect(systemMessage.body).toContainText(SYSTEM_MESSAGE(user.username));
});
test('Verify user cannot flag already flagged message', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            AdditionalSettings: {
                HideFlaggedContent: false,
            },
            NotificationSettings: {
                EventTargetMapping: {
                    assigned: ['reviewers'],
                    dismissed: ['reporter', 'author', 'reviewers'],
                    flagged: ['reviewers'],
                    removed: ['author', 'reporter', 'reviewers'],
                },
            },
        },
    });
    const secondUser = await pw.random.user('mentioned');
    const {id: secondUserID} = await adminClient.createUser(secondUser, '', '');
    await adminClient.addToTeam(team.id, secondUserID);
    const channels = await adminClient.getMyChannels(team.id);
    const townSquare = channels.find((channel) => channel.name === 'town-square');
    if (!townSquare) throw new Error('Town Square channel not found');
    const message = `Post by @${user.username}, is flagged once`;
    const postToBeflagged = await adminClient.createPost({
        channel_id: townSquare.id,
        message,
        user_id: user.id,
    });
    await adminClient.flagPost(postToBeflagged.id, FLAG_REASON_CLASSIFICATION_MISMATCH_ALT, FLAG_COMMENT);
    const channelsPage = await loginAndNavigate(pw, secondUser, team.name, 'town-square');
    const post = await channelsPage.getLastPost();
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.selectFlagReason(FLAG_REASON_CLASSIFICATION_MISMATCH);
    await channelsPage.centerView.flagPostConfirmationDialog.fillFlagComment(FLAG_COMMENT);
    await channelsPage.centerView.flagPostConfirmationDialog.submitButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.cannotFlagAlreadyFlaggedPostToBeVisible();
});
test('Verify user cannot flag a message that was previously retained', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    const secondUser = await pw.random.user('mentioned-');
    const {id: secondUserID, username: secondUsername} = await adminClient.createUser(secondUser, '', '');
    await adminClient.addToTeam(team.id, secondUserID);
    const channels = await adminClient.getMyChannels(team.id);
    const townSquare = channels.find((channel) => channel.name === 'town-square');
    if (!townSquare) throw new Error('Town Square channel not found');
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            AdditionalSettings: {
                HideFlaggedContent: false,
            },
            NotificationSettings: {
                EventTargetMapping: {
                    assigned: ['reviewers'],
                    dismissed: ['reporter', 'author', 'reviewers'],
                    flagged: ['reviewers'],
                    removed: ['author', 'reporter', 'reviewers'],
                },
            },
            ReviewerSettings: {
                CommonReviewers: true,
                SystemAdminsAsReviewers: true,
                TeamAdminsAsReviewers: true,
                CommonReviewerIds: [user.id, secondUserID],
            },
        },
    });
    const message = `Post by @${secondUsername}, is flagged once`;
    const postToBeflagged = await adminClient.createPost({
        channel_id: townSquare.id,
        message,
        user_id: secondUserID,
    });
    await adminClient.flagPost(postToBeflagged.id, FLAG_REASON_CLASSIFICATION_MISMATCH_ALT, FLAG_COMMENT);
    await adminClient.keepFlaggedPost(postToBeflagged.id, 'Retaining this post after review');
    const channelsPage = await loginAndNavigate(pw, secondUser, team.name, 'town-square');
    const post = await channelsPage.getLastPost();
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.selectFlagReason(FLAG_REASON_CLASSIFICATION_MISMATCH);
    await channelsPage.centerView.flagPostConfirmationDialog.fillFlagComment(FLAG_COMMENT);
    await channelsPage.centerView.flagPostConfirmationDialog.submitButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.cannotFlagPreviouslyRetainedPostToBeVisible();
});
test('Verify the Quarantine for Review option is not available when feature is disabled', async ({pw}) => {
    const {user, adminClient} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: false,
        },
    });
    const channelsPage = await loginAndNavigate(pw, user);
    const message = 'This is a test message to be flagged';
    const {post} = await postMessage(channelsPage, message);
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItemNotToBeVisible();
});
test('Verify Flagging reason dropdown', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            AdditionalSettings: {
                Reasons: ['Spam', FLAG_REASON_CLASSIFICATION_MISMATCH, 'Harassment', 'Hate Speech', 'Other'],
            },
        },
    });
    const channelsPage = await loginAndNavigate(pw, user, team.name, 'town-square');
    const message = 'This is a test message to be flagged';
    const {post} = await postMessage(channelsPage, message);
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.selectFlagReason(FLAG_REASON_CLASSIFICATION_MISMATCH);
});
test('Verify Comments are required for Flagging', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            AdditionalSettings: {
                Reasons: ['Spam', FLAG_REASON_CLASSIFICATION_MISMATCH, 'Harassment', 'Hate Speech', 'Other'],
                ReporterCommentRequired: true,
            },
        },
    });
    const channelsPage = await loginAndNavigate(pw, user, team.name, 'town-square');
    const message = 'This is a test message to be flagged';
    const {post} = await postMessage(channelsPage, message);
    await openPostDotMenu(post, channelsPage);
    await channelsPage.postDotMenu.flagMessageMenuItem.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.toContainPostText(message);
    await channelsPage.centerView.flagPostConfirmationDialog.selectFlagReason(FLAG_REASON_CLASSIFICATION_MISMATCH);
    await channelsPage.centerView.flagPostConfirmationDialog.submitButton.click();
    await channelsPage.centerView.flagPostConfirmationDialog.toBeVisible();
    await channelsPage.centerView.flagPostConfirmationDialog.requireCommentsForFlaggingPost();
});
test('Verify message is removed from channel if the reviewer removed the message', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        ContentFlaggingSettings: {
            EnableContentFlagging: true,
            ReviewerSettings: {
                CommonReviewers: true,
                SystemAdminsAsReviewers: true,
                TeamAdminsAsReviewers: true,
                CommonReviewerIds: [user.id],
            },
            AdditionalSettings: {
                HideFlaggedContent: false,
            },
        },
    });
    const channels = await adminClient.getMyChannels(team.id);
    const townSquare = channels.find((channel) => channel.name === 'town-square');
    if (!townSquare) throw new Error('Town Square channel not found');
    const message = `Post by @${user.username}, is flagged once`;
    const postToBeflagged = await adminClient.createPost({
        channel_id: townSquare.id,
        message,
        user_id: user.id,
    });
    await adminClient.flagPost(postToBeflagged.id, FLAG_REASON_CLASSIFICATION_MISMATCH_ALT, FLAG_COMMENT);
    await adminClient.removeFlaggedPost(postToBeflagged.id, 'Removing this post after review');
    const channelsPage = await loginAndNavigate(pw, user, team.name, 'town-square');
    const lastPostId = await channelsPage.centerView.getLastPostID();
    expect(lastPostId).not.toBe(postToBeflagged.id);
});