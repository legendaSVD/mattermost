import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T1515 Verify Accessibility Support in Invite People Flow',
    {tag: ['@accessibility', '@invite_people']},
    async ({pw}) => {
        await pw.skipIfNoLicense();
        const {team, adminUser} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.sidebarLeft.teamMenuButton.click();
        await channelsPage.teamMenu.toBeVisible();
        const invitePeopleMenuItem = page.locator("#sidebarTeamMenu li:has-text('Invite people')");
        await invitePeopleMenuItem.click();
        const inviteModal = page.getByTestId('invitationModal');
        await expect(inviteModal).toBeVisible();
        await expect(inviteModal).toHaveAttribute('aria-modal', 'true');
        await expect(inviteModal).toHaveAttribute('aria-labelledby', 'invitation_modal_title');
        await expect(inviteModal).toHaveAttribute('role', 'dialog');
        const modalTitle = page.locator('#invitation_modal_title');
        await expect(modalTitle).toBeVisible();
        await expect(modalTitle).toContainText('Invite people to');
        const closeButton = inviteModal.locator('button.icon-close');
        await expect(closeButton).toHaveAttribute('aria-label', 'Close');
        await closeButton.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(closeButton).toBeFocused();
    },
);
test(
    'accessibility scan and aria-snapshot of Invite People dialog',
    {tag: ['@accessibility', '@invite_people', '@snapshots']},
    async ({pw, axe}) => {
        await pw.skipIfNoLicense();
        const {team, user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.sidebarLeft.teamMenuButton.click();
        await channelsPage.teamMenu.toBeVisible();
        const invitePeopleMenuItem = page.locator("#sidebarTeamMenu li:has-text('Invite people')");
        await invitePeopleMenuItem.click();
        const inviteModal = page.getByTestId('invitationModal');
        await expect(inviteModal).toBeVisible();
        await pw.wait(pw.duration.one_sec);
        await expect(inviteModal).toMatchAriaSnapshot(`
            - dialog:
              - document:
                - heading [level=1]
                - button
                - text: "To:"
                - log
                - text: Add members
                - combobox "Invite People"
                - listbox
                - button
                - button "Invite" [disabled]
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include('[data-testid="invitationModal"]')
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);