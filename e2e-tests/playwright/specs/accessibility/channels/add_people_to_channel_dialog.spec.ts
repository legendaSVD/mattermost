import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T1468 Accessibility Support in Add people to Channel Dialog screen',
    {tag: ['@accessibility', '@add_people_channel']},
    async ({pw}) => {
        await pw.skipIfNoLicense();
        const {team, adminUser, adminClient} = await pw.initSetup();
        const channel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                displayName: 'Test Channel',
                name: 'test-channel',
            }),
        );
        for (let i = 0; i < 5; i++) {
            const newUser = await adminClient.createUser(await pw.random.user(), '', '');
            await adminClient.addToTeam(team.id, newUser.id);
        }
        const {page, channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, channel.name);
        await channelsPage.toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        const membersMenuItem = page.locator('#channelMembers');
        await membersMenuItem.click();
        const addButton = page.getByRole('button', {name: 'Add people'});
        await addButton.click();
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible();
        const modalName = `Add people to ${channel.display_name}`;
        await expect(dialog.getByRole('heading', {name: modalName})).toBeVisible();
        await pw.wait(pw.duration.one_sec);
        const searchInput = dialog.getByLabel('Search for people or groups');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
        await pw.wait(pw.duration.half_sec);
        await searchInput.fill('u');
        await pw.wait(pw.duration.half_sec);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        const selectedRow = dialog.locator('#multiSelectList').locator('.more-modal__row--selected');
        await expect(selectedRow).toBeVisible();
        const avatar = selectedRow.locator('img.Avatar');
        await expect(avatar).toHaveAttribute('alt', 'user profile image');
        const srOnlyRegion = dialog.locator('.filtered-user-list div.sr-only:not([role="status"])');
        await expect(srOnlyRegion).toHaveAttribute('aria-live', 'polite');
        await expect(srOnlyRegion).toHaveAttribute('aria-atomic', 'true');
        await searchInput.fill('somethingwhichdoesnotexist');
        await pw.wait(pw.duration.half_sec);
        const noResultsWrapper = dialog.locator('.multi-select__wrapper');
        await expect(noResultsWrapper).toHaveAttribute('aria-live', 'polite');
        const noResultsMessage = dialog.locator('.no-channel-message .primary-message');
        await expect(noResultsMessage).toBeVisible();
        await expect(noResultsMessage).toContainText('No results found matching');
    },
);
test(
    'accessibility scan and aria-snapshot of Add people to Channel dialog',
    {tag: ['@accessibility', '@add_people_channel', '@snapshots']},
    async ({pw, axe}) => {
        await pw.skipIfNoLicense();
        const {team, adminUser, adminClient} = await pw.initSetup();
        const channel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                displayName: 'Test Channel',
                name: 'test-channel',
            }),
        );
        for (let i = 0; i < 3; i++) {
            const newUser = await adminClient.createUser(await pw.random.user(), '', '');
            await adminClient.addToTeam(team.id, newUser.id);
        }
        const {page, channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, channel.name);
        await channelsPage.toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        const membersMenuItem = page.locator('#channelMembers');
        await membersMenuItem.click();
        const addButton = page.getByRole('button', {name: 'Add people'});
        await addButton.click();
        const dialog = page.getByRole('dialog').first();
        await expect(dialog).toBeVisible();
        await pw.wait(pw.duration.one_sec);
        await expect(dialog).toMatchAriaSnapshot(`
            - dialog "Add people to Test Channel":
              - document:
                - heading "Add people to Test Channel" [level=1]
                - button "Close"
                - log
                - text: Search for people or groups
                - combobox "Search for people or groups"
                - button "Cancel"
                - button "Add"
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include('[role="dialog"]')
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);