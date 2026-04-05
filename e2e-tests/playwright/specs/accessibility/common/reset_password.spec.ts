import {expect, test} from '@mattermost/playwright-lib';
test('/reset_password accessibility quick check', async ({pw, axe}) => {
    await pw.hasSeenLandingPage();
    await pw.resetPasswordPage.goto();
    await pw.resetPasswordPage.toBeVisible();
    const accessibilityScanResults = await axe
        .builder(pw.resetPasswordPage.page, {disableColorContrast: true})
        .analyze();
    expect(accessibilityScanResults.violations).toHaveLength(0);
});
test('/reset_password accessibility tab support', async ({pw}) => {
    await pw.hasSeenLandingPage();
    await pw.resetPasswordPage.goto();
    await pw.resetPasswordPage.toBeVisible();
    expect(await pw.resetPasswordPage.emailInput).toBeFocused();
    await pw.resetPasswordPage.emailInput.press('Tab');
    expect(await pw.resetPasswordPage.resetButton).toBeFocused();
    await pw.resetPasswordPage.resetButton.press('Tab');
    expect(await pw.resetPasswordPage.footer.aboutLink).toBeFocused();
    await pw.resetPasswordPage.footer.aboutLink.press('Tab');
    expect(await pw.resetPasswordPage.footer.privacyPolicyLink).toBeFocused();
    await pw.resetPasswordPage.footer.privacyPolicyLink.press('Tab');
    expect(await pw.resetPasswordPage.footer.termsLink).toBeFocused();
    await pw.resetPasswordPage.footer.termsLink.press('Tab');
    expect(await pw.resetPasswordPage.footer.helpLink).toBeFocused();
    await pw.resetPasswordPage.emailInput.focus();
    expect(await pw.resetPasswordPage.emailInput).toBeFocused();
    await pw.resetPasswordPage.emailInput.press('Shift+Tab');
    expect(await pw.resetPasswordPage.header.backButton).toBeFocused();
});