import {expect, test} from '@mattermost/playwright-lib';
test('Profile popover should show correct fields after at-mention autocomplete @user_profile', async ({pw}) => {
    const {user, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        PrivacySettings: {
            ShowEmailAddress: false,
            ShowFullName: false,
        },
    });
    const testUser2 = await adminClient.createUser(await pw.random.user('other'), '', '');
    await adminClient.addToTeam(team.id, testUser2.id);
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.postMessage(`@${user.username} @${testUser2.username}`);
    const lastPost = await channelsPage.getLastPost();
    const firstMention = await lastPost.container.getByText(`@${user.username}`, {exact: true});
    await firstMention.click();
    const currentUserProfilePopover = channelsPage.userProfilePopover;
    await expect(currentUserProfilePopover.container.getByText(`@${user.username}`)).toBeVisible();
    await expect(currentUserProfilePopover.container.getByText(`${user.first_name} ${user.last_name}`)).toBeVisible();
    await expect(currentUserProfilePopover.container.getByText(user.email)).toBeVisible();
    await currentUserProfilePopover.close();
    const secondMention = await lastPost.container.getByText(`@${testUser2.username}`, {exact: true});
    await secondMention.click();
    const otherUserProfilePopover = channelsPage.userProfilePopover;
    await expect(otherUserProfilePopover.container.getByText(`@${testUser2.username}`)).toBeVisible();
    await expect(otherUserProfilePopover.container.getByText(testUser2.email)).not.toBeVisible();
    await otherUserProfilePopover.close();
    await channelsPage.centerView.postCreate.writeMessage(`@${user.username}`);
    const suggestionList = channelsPage.centerView.postCreate.suggestionList;
    await expect(suggestionList.getByText(`@${user.username}`)).toBeVisible();
    await channelsPage.centerView.postCreate.writeMessage('');
    const profilePopoverAgain = await channelsPage.openProfilePopover(lastPost);
    await expect(profilePopoverAgain.container.getByText(`@${user.username}`)).toBeVisible();
    await expect(profilePopoverAgain.container.getByText(`${user.first_name} ${user.last_name}`)).toBeVisible();
    await expect(profilePopoverAgain.container.getByText(user.email)).toBeVisible();
});