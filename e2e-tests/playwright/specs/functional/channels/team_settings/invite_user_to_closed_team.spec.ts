import {ChannelsPage, expect, test} from '@mattermost/playwright-lib';
test('MM-T388 Invite new user to closed team with email domain restriction', {tag: '@team_settings'}, async ({pw}) => {
    const emailDomain = 'sample.mattermost.com';
    const {adminUser, adminClient, team} = await pw.initSetup();
    await adminClient.patchConfig({
        ServiceSettings: {EnableEmailInvitations: true},
    });
    const newUser = await adminClient.createUser(await pw.random.user(), '', '');
    const {page} = await pw.testBrowser.login(adminUser);
    const channelsPage = new ChannelsPage(page);
    await channelsPage.goto(team.name);
    await page.waitForLoadState('networkidle');
    const teamSettings = await channelsPage.openTeamSettings();
    const accessSettings = await teamSettings.openAccessTab();
    await accessSettings.enableAllowedDomains();
    await accessSettings.addDomain(emailDomain);
    await teamSettings.save();
    await teamSettings.verifySavedMessage();
    await teamSettings.close();
    await expect(teamSettings.container).not.toBeVisible();
    await channelsPage.sidebarLeft.teamMenuButton.click();
    await channelsPage.teamMenu.toBeVisible();
    await channelsPage.teamMenu.clickInvitePeople();
    const inviteModal = await channelsPage.getInvitePeopleModal(team.display_name);
    await inviteModal.toBeVisible();
    await inviteModal.inviteByEmail(newUser.email);
    const membersInvitedModal = await channelsPage.getMembersInvitedModal(team.display_name);
    await membersInvitedModal.toBeVisible();
    const sentReason = await membersInvitedModal.getSentResultReason();
    expect(sentReason).toBe('This member has been added to the team.');
    await membersInvitedModal.clickInviteMore();
    const invalidEmail = `user.${await pw.random.id()}@invalid.com`;
    await inviteModal.inviteByEmail(invalidEmail);
    const membersInvitedModal2 = await channelsPage.getMembersInvitedModal(team.display_name);
    await membersInvitedModal2.toBeVisible();
    const notSentReason = await membersInvitedModal2.getNotSentResultReason();
    expect(notSentReason).toContain(
        `The following email addresses do not belong to an accepted domain: ${invalidEmail}.`,
    );
});