import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T1466 Accessibility Support in Direct Messages Dialog screen',
    {tag: ['@accessibility', '@direct_messages']},
    async ({pw}) => {
        await pw.skipIfNoLicense();
        const {team, adminUser, adminClient} = await pw.initSetup();
        const user2 = await adminClient.createUser(await pw.random.user(), '', '');
        await adminClient.addToTeam(team.id, user2.id);
        const {page, channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const writeDirectMessageButton = page.getByRole('button', {name: 'Write a direct message'});
        await writeDirectMessageButton.click();
        const dialog = page.getByRole('dialog', {name: 'Direct Messages'});
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('heading', {name: 'Direct Messages'})).toBeVisible();
        const searchInput = dialog.getByLabel('Search for people');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
        await searchInput.fill('s');
        await pw.wait(pw.duration.half_sec);
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
        const invalidSearchTerm = 'somethingwhichdoesnotexist';
        await searchInput.clear();
        await searchInput.fill(invalidSearchTerm);
        await pw.wait(pw.duration.half_sec);
        const noResultsWrapper = dialog.locator('.multi-select__wrapper');
        await expect(noResultsWrapper).toHaveAttribute('aria-live', 'polite');
        await expect(noResultsWrapper).toContainText(`No results found matching ${invalidSearchTerm}`);
    },
);
test(
    'accessibility scan and aria-snapshot of Direct Messages dialog',
    {tag: ['@accessibility', '@direct_messages', '@snapshots']},
    async ({pw, axe}) => {
        await pw.skipIfNoLicense();
        const {team, user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const writeDirectMessageButton = page.getByRole('button', {name: 'Write a direct message'});
        await writeDirectMessageButton.click();
        const dialog = page.getByRole('dialog', {name: 'Direct Messages'});
        await expect(dialog).toBeVisible();
        await pw.wait(pw.duration.one_sec);
        await expect(dialog).toMatchAriaSnapshot(`
            - dialog "Direct Messages":
              - document:
                - heading "Direct Messages" [level=1]
                - button "Close"
                - application:
                  - log
                  - text: Search for people
                  - combobox "Search for people"
                  - button "Go"
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include('[role="dialog"]')
            .disableRules(['scrollable-region-focusable'])
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);