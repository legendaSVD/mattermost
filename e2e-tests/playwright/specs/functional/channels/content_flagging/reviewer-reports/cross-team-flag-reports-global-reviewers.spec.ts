import {test} from '@mattermost/playwright-lib';
import {createPost, verifyFlaggedPostCardDetails, verifyRHSFlaggedPostDetails} from './../support';
test('Verify reviewer from another team can receive a review request for a flagged post', async ({pw}) => {
    const reasonToFlag = 'Classification mismatch';
    const flagPostReviewStatus = 'Pending';
    const flagPostComment = 'This message is inappropriate';
    const {adminClient, team, user, userClient, adminUser} = await pw.initSetup();
    const secondTeam = await userClient.createTeam(await pw.random.team('team', 'Team', 'O', true));
    const secondUser = await pw.random.user('mentioned');
    const {id: secondUserID} = await adminClient.createUser(secondUser, '', '');
    await adminClient.addToTeam(secondTeam.id, secondUserID);
    await adminClient.saveContentFlaggingConfig({
        EnableContentFlagging: true,
        NotificationSettings: {
            EventTargetMapping: {
                assigned: ['reviewers', 'author'],
                dismissed: ['reporter', 'author', 'reviewers'],
                flagged: ['reviewers', 'author'],
                removed: ['author', 'reporter', 'reviewers'],
            },
        },
        ReviewerSettings: {
            CommonReviewers: true,
            CommonReviewerIds: [user.id, adminUser.id, secondUserID],
            TeamReviewersSetting: {},
            SystemAdminsAsReviewers: true,
            TeamAdminsAsReviewers: true,
        },
        AdditionalSettings: {
            Reasons: ['Classification mismatch', 'Need-to-know violation', 'Unauthorized disclosure', 'Other'],
            ReporterCommentRequired: true,
            ReviewerCommentRequired: true,
            HideFlaggedContent: true,
        },
    });
    const message = `Post by @${user.username}, is flagged once`;
    const {post, townSquare} = await createPost(adminClient, userClient, team, user, message);
    await adminClient.flagPost(post.id, reasonToFlag, flagPostComment);
    const {channelsPage, contentReviewPage} = await pw.testBrowser.login(secondUser);
    await verifyFlaggedPostCardDetails(post.id, channelsPage, contentReviewPage, secondTeam, message);
    await verifyRHSFlaggedPostDetails(
        post.id,
        contentReviewPage,
        user.username,
        adminUser.username,
        message,
        reasonToFlag,
        flagPostReviewStatus,
        townSquare.display_name,
    );
});