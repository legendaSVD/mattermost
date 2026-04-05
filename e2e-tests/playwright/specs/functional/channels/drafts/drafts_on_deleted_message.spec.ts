import {expect, test} from '@mattermost/playwright-lib';
test('MM-T5435_1 Global Drafts link in sidebar should be hidden when another user deleted root post and user removes the deleted post ', async ({
    pw,
}) => {
    const {adminClient, team, adminUser, user} = await pw.initSetup();
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const channel = await adminClient.getChannelByName(team.id, 'town-square');
    const adminPost = await adminClient.createPost(
        pw.random.post({
            channel_id: channel.id,
            user_id: adminUser.id,
        }),
    );
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    const lastPostByAdmin = await channelsPage.getLastPost();
    await lastPostByAdmin.toBeVisible();
    await lastPostByAdmin.hover();
    await lastPostByAdmin.postMenu.toBeVisible();
    await lastPostByAdmin.postMenu.reply();
    const sidebarRight = channelsPage.sidebarRight;
    await sidebarRight.toBeVisible();
    await sidebarRight.postMessage('Replying to a thread');
    const draftMessageByUser = 'I should be in drafts by User';
    await sidebarRight.postCreate.writeMessage(draftMessageByUser);
    await sidebarRight.close();
    await channelsPage.sidebarLeft.draftsVisible();
    try {
        await adminClient.deletePost(adminPost.id);
    } catch (error) {
        throw new Error(`Failed to delete post by admin: ${error}`);
    }
    await lastPostByAdmin.body.click();
    const rhsTextboxValue = await sidebarRight.postCreate.getInputValue();
    expect(rhsTextboxValue).toBe(draftMessageByUser);
    const deletedPostByAdminInRHS = await sidebarRight.getPostById(adminPost.id);
    await deletedPostByAdminInRHS.remove();
    await channelsPage.sidebarLeft.draftsNotVisible();
});
test(
    'MM-T5435_2 Global Drafts link in sidebar should be hidden when user deletes root post ',
    {tag: '@smoke'},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await channelsPage.postMessage('Message which will be deleted');
        const post = await channelsPage.getLastPost();
        await post.hover();
        await post.postMenu.toBeVisible();
        await post.postMenu.reply();
        const sidebarRight = channelsPage.sidebarRight;
        await sidebarRight.toBeVisible();
        await sidebarRight.postMessage('Replying to a thread');
        await sidebarRight.postCreate.writeMessage('I should be in drafts');
        await sidebarRight.close();
        await channelsPage.sidebarLeft.draftsVisible();
        await post.hover();
        await post.postMenu.toBeVisible();
        await post.postMenu.openDotMenu();
        await channelsPage.postDotMenu.toBeVisible();
        await channelsPage.postDotMenu.deleteMenuItem.click();
        await channelsPage.deletePostModal.toBeVisible();
        await channelsPage.deletePostModal.confirm();
        await channelsPage.sidebarLeft.draftsNotVisible();
    },
);