import {expect, test} from '@mattermost/playwright-lib';
test('/signup_user_complete accessibility quick check', async ({pw, axe}) => {
    await pw.hasSeenLandingPage();
    await pw.signupPage.goto();
    await pw.signupPage.toBeVisible();
    const accessibilityScanResults = await axe
        .builder(pw.signupPage.page, {disableColorContrast: true, disableLinkInTextBlock: true})
        .analyze();
    expect(accessibilityScanResults.violations).toHaveLength(0);
});
test('/signup_user_complete accessibility tab support', async ({pw}, testInfo) => {
    await pw.hasSeenLandingPage();
    await pw.signupPage.goto();
    await pw.signupPage.toBeVisible();
    expect(await pw.signupPage.emailInput).toBeFocused();
    await pw.signupPage.emailInput.press('Tab');
    expect(await pw.signupPage.usernameInput).toBeFocused();
    await pw.signupPage.usernameInput.press('Tab');
    expect(await pw.signupPage.passwordInput).toBeFocused();
    await pw.signupPage.passwordInput.press('Tab');
    expect(await pw.signupPage.passwordToggleButton).toBeFocused();
    await pw.signupPage.passwordToggleButton.press('Tab');
    expect(await pw.signupPage.termsAndPrivacyCheckBox).toBeFocused();
    await pw.signupPage.termsAndPrivacyCheckBox.press('Tab');
    expect(await pw.signupPage.termsAndPrivacyAcceptableUsePolicyLink).toBeFocused();
    await pw.signupPage.termsAndPrivacyAcceptableUsePolicyLink.press('Tab');
    expect(await pw.signupPage.termsAndPrivacyPrivacyPolicyLink).toBeFocused();
    await pw.signupPage.termsAndPrivacyPrivacyPolicyLink.press('Tab');
    expect(await pw.signupPage.footer.aboutLink).toBeFocused();
    await pw.signupPage.footer.aboutLink.press('Tab');
    expect(await pw.signupPage.footer.privacyPolicyLink).toBeFocused();
    await pw.signupPage.footer.privacyPolicyLink.press('Tab');
    expect(await pw.signupPage.footer.termsLink).toBeFocused();
    await pw.signupPage.footer.termsLink.press('Tab');
    expect(await pw.signupPage.footer.helpLink).toBeFocused();
    await pw.signupPage.emailInput.focus();
    expect(await pw.signupPage.emailInput).toBeFocused();
    if (testInfo.project.name === 'ipad') {
        await pw.signupPage.bodyCard.press('Shift+Tab');
        expect(await pw.signupPage.header.backButton).toBeFocused();
        await pw.signupPage.header.backButton.press('Shift+Tab');
        expect(await pw.signupPage.loginLink).toBeFocused();
        await pw.signupPage.loginLink.press('Shift+Tab');
        expect(await pw.signupPage.header.logo).toBeFocused();
    } else {
        await pw.signupPage.bodyCard.press('Shift+Tab');
        expect(await pw.signupPage.loginLink).toBeFocused();
        await pw.signupPage.loginLink.press('Shift+Tab');
        expect(await pw.signupPage.header.backButton).toBeFocused();
        await pw.signupPage.header.backButton.press('Shift+Tab');
        expect(await pw.signupPage.header.logo).toBeFocused();
    }
});