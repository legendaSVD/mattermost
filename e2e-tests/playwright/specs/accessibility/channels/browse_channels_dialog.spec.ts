import {expect, test} from '@mattermost/playwright-lib';
test(
    'MM-T1467 Accessibility Support in Browse Channels Dialog screen',
    {tag: ['@accessibility', '@browse_channels']},
    async ({pw}) => {
        await pw.skipIfNoLicense();
        const {team, user, adminClient} = await pw.initSetup();
        const channel1 = await adminClient.createChannel({
            team_id: team.id,
            name: 'accessibility-' + Date.now(),
            display_name: 'Accessibility',
            type: 'O',
            purpose: 'some purpose',
        });
        const channel2 = await adminClient.createChannel({
            team_id: team.id,
            name: 'z-accessibility-' + Date.now(),
            display_name: 'Z Accessibility',
            type: 'O',
            purpose: 'other purpose',
        });
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const dialog = await channelsPage.openBrowseChannelsModal();
        const searchInput = dialog.searchInput;
        await expect(searchInput).toBeVisible();
        await dialog.toBeDoneLoading();
        const hideJoinedCheckbox = dialog.hideJoinedCheckbox;
        await hideJoinedCheckbox.click();
        const createChannelButton = dialog.createNewChannelButton;
        await createChannelButton.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await dialog.toHaveChannelAsNthResult(channel1.name, 0);
        const channel1AriaLabel = `${channel1.display_name.toLowerCase()}, ${channel1.purpose.toLowerCase()}`;
        const channel1Item = dialog.container.getByLabel(channel1AriaLabel);
        await expect(channel1Item).toBeVisible();
        await expect(channel1Item).toBeFocused();
        await page.keyboard.press('Tab');
        await dialog.toHaveChannelAsNthResult(channel2.name, 1);
        const channel2AriaLabel = `${channel2.display_name.toLowerCase()}, ${channel2.purpose.toLowerCase()}`;
        const channel2Item = dialog.container.getByLabel(channel2AriaLabel);
        await expect(channel2Item).toBeFocused();
    },
);
test(
    'accessibility scan and aria-snapshot of Browse Channels dialog',
    {tag: ['@accessibility', '@browse_channels', '@snapshots']},
    async ({pw, axe}) => {
        await pw.skipIfNoLicense();
        const {team, user} = await pw.initSetup();
        const {page, channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        const dialog = await channelsPage.openBrowseChannelsModal();
        await expect(dialog.container).toMatchAriaSnapshot(`
            - dialog "Browse Channels":
              - document:
                - heading "Browse Channels" [level=1]
                - button "Create New Channel"
                - button "Close"
                - textbox "Search Channels"
                - /text: \\d+ Results/
                - /status: \\d+ Results/
                - status: Channel type filter set to All
                - button "Channel type filter"
                - checkbox "Hide joined channels": Hide Joined
                - search
        `);
        const accessibilityScanResults = await axe
            .builder(page, {disableColorContrast: true})
            .include('[role="dialog"]')
            .analyze();
        expect(accessibilityScanResults.violations).toHaveLength(0);
    },
);