import {expect, test} from '@mattermost/playwright-lib';
test.fixme('Base channel accessibility', async ({pw, axe}) => {
    const {user} = await pw.initSetup();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('hello');
    const accessibilityScanResults = await axe.builder(page, {disableColorContrast: true}).analyze();
    expect(accessibilityScanResults.violations).toHaveLength(0);
});
test('Post actions tab support', async ({pw, axe}) => {
    const {user, adminClient} = await pw.initSetup();
    const config = await adminClient.getConfig();
    const license = await adminClient.getClientLicenseOld();
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.toBeVisible();
    await channelsPage.postMessage('hello');
    const post = await channelsPage.getLastPost();
    await post.hover();
    await post.postMenu.toBeVisible();
    await post.postMenu.dotMenuButton.press('Enter');
    await channelsPage.postDotMenu.toBeVisible();
    await expect(channelsPage.postDotMenu.replyMenuItem).toBeFocused();
    const accessibilityScanResults = await axe
        .builder(page, {disableColorContrast: true})
        .include('.MuiList-root.MuiList-padding')
        .analyze();
    expect(accessibilityScanResults.violations).toHaveLength(0);
    await channelsPage.postDotMenu.replyMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.forwardMenuItem).toBeFocused();
    await channelsPage.postDotMenu.forwardMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.followMessageMenuItem).toBeFocused();
    await channelsPage.postDotMenu.followMessageMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.markAsUnreadMenuItem).toBeFocused();
    await channelsPage.postDotMenu.markAsUnreadMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.saveMenuItem).toBeFocused();
    await channelsPage.postDotMenu.saveMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.remindMenuItem).toBeFocused();
    await channelsPage.postDotMenu.remindMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.pinToChannelMenuItem).toBeFocused();
    if (config.FeatureFlags['MoveThreadsEnabled'] && license.IsLicensed === 'true') {
        await channelsPage.postDotMenu.pinToChannelMenuItem.press('ArrowDown');
        await expect(channelsPage.postDotMenu.moveThreadMenuItem).toBeFocused();
        await channelsPage.postDotMenu.moveThreadMenuItem.press('ArrowDown');
        await expect(channelsPage.postDotMenu.copyTextMenuItem).toBeFocused();
    } else {
        await channelsPage.postDotMenu.pinToChannelMenuItem.press('ArrowDown');
        await expect(channelsPage.postDotMenu.copyTextMenuItem).toBeFocused();
    }
    await channelsPage.postDotMenu.copyTextMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.copyLinkMenuItem).toBeFocused();
    await channelsPage.postDotMenu.copyLinkMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.editMenuItem).toBeFocused();
    await channelsPage.postDotMenu.editMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.deleteMenuItem).toBeFocused();
    await channelsPage.postDotMenu.deleteMenuItem.press('ArrowDown');
    await expect(channelsPage.postDotMenu.replyMenuItem).toBeFocused();
    await channelsPage.postDotMenu.container.press('ArrowUp');
    expect(await channelsPage.postDotMenu.deleteMenuItem).toBeFocused();
    await channelsPage.postDotMenu.remindMenuItem.focus();
    await expect(channelsPage.postDotMenu.remindMenuItem).toBeFocused();
    await expect(channelsPage.postReminderMenu.container).toBeHidden();
    await channelsPage.postDotMenu.remindMenuItem.press('ArrowRight');
    expect(channelsPage.postReminderMenu.container).toBeVisible();
    expect(await channelsPage.postReminderMenu.thirtyMinsMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.thirtyMinsMenuItem.press('ArrowDown');
    expect(await channelsPage.postReminderMenu.oneHourMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.oneHourMenuItem.press('ArrowDown');
    expect(await channelsPage.postReminderMenu.twoHoursMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.twoHoursMenuItem.press('ArrowDown');
    expect(await channelsPage.postReminderMenu.tomorrowMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.tomorrowMenuItem.press('ArrowDown');
    expect(await channelsPage.postReminderMenu.customMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.customMenuItem.press('ArrowDown');
    expect(await channelsPage.postReminderMenu.thirtyMinsMenuItem).toBeFocused();
    await channelsPage.postReminderMenu.container.press('ArrowLeft');
    await expect(channelsPage.postReminderMenu.container).toBeHidden();
    await expect(channelsPage.postDotMenu.remindMenuItem).toBeFocused();
    await channelsPage.postDotMenu.container.press('Escape');
    await expect(channelsPage.postDotMenu.container).toBeHidden();
});