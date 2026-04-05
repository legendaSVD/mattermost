import {expect, test} from '@mattermost/playwright-lib';
test(
    'navigate using arrow keys between menu items',
    {tag: ['@accessibility', '@team_menu', '@keyboard_navigation']},
    async ({pw}) => {
        const {user, team, adminClient} = await pw.initSetup();
        await adminClient.updateTeamMemberSchemeRoles(team.id, user.id, true, true);
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.focus();
        await page.keyboard.press('Enter');
        await pw.logFocusedElement(page);
        await teamMenu.toBeVisible();
        await pw.toBeFocusedWithFocusVisible(teamMenu.invitePeople);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(teamMenu.teamSettings);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(teamMenu.manageMembers);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(teamMenu.leaveTeam);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(teamMenu.createTeam);
        await page.keyboard.press('ArrowDown');
        await pw.toBeFocusedWithFocusVisible(teamMenu.learnAboutTeams);
    },
);
test(
    'navigate using Tab key to escape menu',
    {tag: ['@accessibility', '@team_menu', '@keyboard_navigation']},
    async ({pw}) => {
        const {user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.focus();
        await page.keyboard.press('Enter');
        await teamMenu.toBeVisible();
        await pw.toBeFocusedWithFocusVisible(teamMenu.invitePeople);
        await page.keyboard.press('Tab');
        await expect(teamMenu.container).not.toBeVisible();
        await expect(sidebarLeft.teamMenuButton).not.toBeFocused();
        await expect(sidebarLeft.browseOrCreateChannelButton).toBeFocused();
    },
);
test(
    'activate menu items using Enter and Space keys',
    {tag: ['@accessibility', '@team_menu', '@keyboard_navigation']},
    async ({pw}) => {
        const {user, team, adminClient} = await pw.initSetup();
        await adminClient.updateTeamMemberSchemeRoles(team.id, user.id, true, true);
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.focus();
        await page.keyboard.press('Enter');
        await teamMenu.toBeVisible();
        await teamMenu.teamSettings.focus();
        await page.keyboard.press('Enter');
        await channelsPage.teamSettingsModal.toBeVisible();
        await page.keyboard.press('Escape');
        await expect(channelsPage.teamSettingsModal.container).not.toBeVisible();
        await sidebarLeft.teamMenuButton.focus();
        await page.keyboard.press('Enter');
        await teamMenu.toBeVisible();
        await teamMenu.invitePeople.focus();
        await page.keyboard.press(' ');
        const invitePeopleModal = await channelsPage.getInvitePeopleModal(team.display_name);
        await invitePeopleModal.toBeVisible();
    },
);
test('close menu using Escape key', {tag: ['@accessibility', '@team_menu', '@keyboard_navigation']}, async ({pw}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    const sidebarLeft = channelsPage.sidebarLeft;
    const teamMenu = channelsPage.teamMenu;
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await sidebarLeft.teamMenuButton.click();
    await teamMenu.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(teamMenu.container).not.toBeVisible();
    await pw.toBeFocusedWithFocusVisible(sidebarLeft.teamMenuButton);
});
test(
    'accessibility scan and aria-snapshot of team menu',
    {tag: ['@accessibility', '@team_menu', '@snapshots']},
    async ({pw, axe}) => {
        const {user, team, adminClient} = await pw.initSetup();
        await adminClient.updateTeamMemberSchemeRoles(team.id, user.id, true, true);
        const {page, channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.click();
        await teamMenu.toBeVisible();
        await expect(teamMenu.container).toMatchAriaSnapshot();
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include(teamMenu.getContainerId())
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);
test(
    'verify ARIA attributes and screen reader support',
    {tag: ['@accessibility', '@team_menu', '@screen_reader']},
    async ({pw}) => {
        const {user, team, adminClient} = await pw.initSetup();
        await adminClient.updateTeamMemberSchemeRoles(team.id, user.id, true, true);
        const {channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.click();
        await teamMenu.toBeVisible();
        await expect(teamMenu.container).toHaveAttribute('role', 'menu');
        await expect(teamMenu.invitePeople).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.invitePeople).toHaveAttribute('aria-haspopup', 'dialog');
        await expect(teamMenu.teamSettings).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.teamSettings).toHaveAttribute('aria-haspopup', 'dialog');
        await expect(teamMenu.manageMembers).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.manageMembers).toHaveAttribute('aria-haspopup', 'dialog');
        await expect(teamMenu.leaveTeam).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.leaveTeam).toHaveAttribute('aria-haspopup', 'dialog');
        await expect(teamMenu.createTeam).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.learnAboutTeams).toHaveAttribute('role', 'menuitem');
        await expect(teamMenu.invitePeople).toHaveAttribute('tabindex', '0');
        await expect(teamMenu.invitePeople).toHaveAccessibleName('Invite people Add or invite people to the team');
        await expect(teamMenu.teamSettings).toHaveAccessibleName('Team settings');
        await expect(teamMenu.manageMembers).toHaveAccessibleName('Manage members');
        await expect(teamMenu.leaveTeam).toHaveAccessibleName('Leave team');
        await expect(teamMenu.createTeam).toHaveAccessibleName('Create a team');
        await expect(teamMenu.learnAboutTeams).toHaveAccessibleName('Learn about teams');
    },
);
test(
    'verify visual indicators and icon accessibility',
    {tag: ['@accessibility', '@team_menu', '@visual_indicators']},
    async ({pw}) => {
        const {user, team, adminClient} = await pw.initSetup();
        await adminClient.updateTeamMemberSchemeRoles(team.id, user.id, true, true);
        const {channelsPage} = await pw.testBrowser.login(user);
        const sidebarLeft = channelsPage.sidebarLeft;
        const teamMenu = channelsPage.teamMenu;
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        await sidebarLeft.teamMenuButton.click();
        await teamMenu.toBeVisible();
        const menuItems = [
            teamMenu.invitePeople,
            teamMenu.teamSettings,
            teamMenu.manageMembers,
            teamMenu.leaveTeam,
            teamMenu.createTeam,
            teamMenu.learnAboutTeams,
        ];
        for (const menuItem of menuItems) {
            const icon = menuItem.locator('svg').first();
            await expect(icon).toHaveAttribute('aria-hidden', 'true');
            await menuItem.focus();
            await pw.toBeFocusedWithFocusVisible(menuItem);
        }
    },
);