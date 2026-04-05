import {expect, test} from '@mattermost/playwright-lib';
test('should be able to enable mobile security settings when licensed', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(
        license.SkuShortName !== 'enterprise' || license.short_sku_name !== 'advanced',
        'Skipping test - server has no enterprise or enterprise advanced license',
    );
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.selectTrue();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeFalse();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeFalse();
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeFalse();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeFalse();
    await systemConsolePage.mobileSecurity.preventScreenCapture.selectTrue();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeFalse();
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeFalse();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.selectTrue();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
    await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
    await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
    if (license.SkuShortName === 'advanced') {
        await systemConsolePage.mobileSecurity.enableSecureFilePreviewMode.selectTrue();
        await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
        await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
        await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
        await systemConsolePage.mobileSecurity.enableSecureFilePreviewMode.toBeTrue();
        await systemConsolePage.mobileSecurity.allowPdfLinkNavigation.toBeFalse();
        await systemConsolePage.mobileSecurity.save();
        await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.sidebar.mobileSecurity.click();
        await systemConsolePage.mobileSecurity.toBeVisible();
        await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
        await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
        await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
        await systemConsolePage.mobileSecurity.enableSecureFilePreviewMode.toBeTrue();
        await systemConsolePage.mobileSecurity.allowPdfLinkNavigation.toBeFalse();
        await systemConsolePage.mobileSecurity.allowPdfLinkNavigation.selectTrue();
        await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
        await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
        await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
        await systemConsolePage.mobileSecurity.enableSecureFilePreviewMode.toBeTrue();
        await systemConsolePage.mobileSecurity.allowPdfLinkNavigation.toBeTrue();
        await systemConsolePage.mobileSecurity.save();
        await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
        await systemConsolePage.sidebar.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.sidebar.mobileSecurity.click();
        await systemConsolePage.mobileSecurity.toBeVisible();
        await systemConsolePage.mobileSecurity.enableBiometricAuthentication.toBeTrue();
        await systemConsolePage.mobileSecurity.preventScreenCapture.toBeTrue();
        await systemConsolePage.mobileSecurity.enableJailbreakProtection.toBeTrue();
        await systemConsolePage.mobileSecurity.enableSecureFilePreviewMode.toBeTrue();
        await systemConsolePage.mobileSecurity.allowPdfLinkNavigation.toBeTrue();
    }
});
test('should show mobile security upsell when not licensed', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(
        license.SkuShortName !== 'enterprise' || license.short_sku_name !== 'advanced',
        'Skipping test - server has no enterprise or enterprise advanced license',
    );
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.featureDiscovery.toBeVisible();
    await systemConsolePage.featureDiscovery.toHaveTitle('Enhance mobile app security with Mattermost Enterprise');
});
test('should show and enable Intune MAM when Enterprise Advanced licensed and Office365 configured', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const config = await adminClient.getConfig();
    config.Office365Settings.Enable = true;
    config.Office365Settings.Id = 'test-client-id';
    config.Office365Settings.Secret = 'test-client-secret';
    config.Office365Settings.DirectoryId = 'test-directory-id';
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.trueOption).toBeVisible();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.falseOption).toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.selectTrue();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.toBeTrue();
    await systemConsolePage.mobileSecurity.authProvider.select('office365');
    await systemConsolePage.mobileSecurity.tenantId.fill('12345678-1234-1234-1234-123456789012');
    await systemConsolePage.mobileSecurity.clientId.fill('87654321-4321-4321-4321-210987654321');
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.toBeTrue();
});
test('should hide Intune MAM when Office365 is not configured', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const config = await adminClient.getConfig();
    config.Office365Settings.Enable = false;
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.trueOption).toBeVisible();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.falseOption).toBeVisible();
    await expect(systemConsolePage.mobileSecurity.authProvider.dropdown).toBeDisabled();
});
test('should configure new IntuneSettings with Office365 auth provider', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const config = await adminClient.getConfig();
    config.Office365Settings.Enable = true;
    config.Office365Settings.Id = 'test-office365-client-id';
    config.Office365Settings.Secret = 'test-office365-secret';
    config.Office365Settings.DirectoryId = 'test-office365-directory-id';
    config.SamlSettings.EmailAttribute = 'useremail';
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.trueOption).toBeVisible();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.falseOption).toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.selectTrue();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.toBeTrue();
    await systemConsolePage.mobileSecurity.authProvider.select('office365');
    await systemConsolePage.mobileSecurity.tenantId.fill('12345678-1234-1234-1234-123456789012');
    await systemConsolePage.mobileSecurity.clientId.fill('87654321-4321-4321-4321-210987654321');
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.toBeTrue();
    expect(await systemConsolePage.mobileSecurity.tenantId.getValue()).toBe('12345678-1234-1234-1234-123456789012');
    expect(await systemConsolePage.mobileSecurity.clientId.getValue()).toBe('87654321-4321-4321-4321-210987654321');
});
test('should configure new IntuneSettings with SAML auth provider', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const config = await adminClient.getConfig();
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const serverUrl = process.env.MM_SERVER_URL || 'http://localhost:8065';
    const idpCert = `-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKC1r6Qw3v6OMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNVBAYTAlVTMRYwFAYDVQQIDA1Tb21lLVN0YXRlMRYwFAYDVQQKDA1FeGFtcGxlIEluYy4wHhcNMTkwMTAxMDAwMDAwWhcNMjkwMTAxMDAwMDAwWjBFMQswCQYDVQQGEwJVUzEWMBQGA1UECAwNU29tZS1TdGF0ZTEWMBQGA1UECgwNRXhhbXBsZSBJbmMuMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6QwIDAQABo1AwTjAdBgNVHQ4EFgQU6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMAwGA1UdEwQFMAMBAf8wHwYDVR0jBBgwFoAU6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAKQw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw3v6OMC1r6Qw=\n-----END CERTIFICATE-----\n`;
    const idpFormData = new FormData();
    idpFormData.append(
        'certificate',
        new Blob([idpCert], {type: 'application/x-x509-ca-cert'}),
        'Intune SAML Test.cer',
    );
    await fetch(`${serverUrl}/api/v4/saml/certificate/idp`, {
        method: 'POST',
        body: idpFormData,
        credentials: 'include',
    });
    const spCert = `-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArv1Qw4v7OMC2r7Qw4v7OMC2r7Qw4v7OMC2r7QwIDAQAB\n-----END CERTIFICATE-----\n`;
    const spFormData = new FormData();
    spFormData.append('certificate', new Blob([spCert], {type: 'application/x-x509-ca-cert'}), 'saml-public-cert.pem');
    await fetch(`${serverUrl}/api/v4/saml/certificate/public`, {
        method: 'POST',
        body: spFormData,
        credentials: 'include',
    });
    config.SamlSettings.Enable = true;
    config.SamlSettings.IdpURL = 'https://example.com/saml';
    config.SamlSettings.IdpDescriptorURL = 'https://example.com/saml/metadata';
    config.SamlSettings.IdpCertificateFile = 'test-cert.pem';
    config.SamlSettings.EmailAttribute = 'useremail';
    config.SamlSettings.UsernameAttribute = 'username';
    config.SamlSettings.ServiceProviderIdentifier = 'sp-entity-id';
    config.SamlSettings.AssertionConsumerServiceURL = 'https://sp.example.com/login';
    config.SamlSettings.IdpCertificateFile = 'saml-idp.crt';
    config.SamlSettings.PrivateKeyFile = 'saml-idp.crt';
    if ('PublicCertificateFile' in config.SamlSettings) {
        config.SamlSettings.PublicCertificateFile = 'saml-public-cert.pem';
    }
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await expect(systemConsolePage.mobileSecurity.enableIntuneMAM.trueOption).toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.selectTrue();
    await systemConsolePage.mobileSecurity.authProvider.select('saml');
    await systemConsolePage.mobileSecurity.tenantId.fill('abcdef01-2345-6789-abcd-ef0123456789');
    await systemConsolePage.mobileSecurity.clientId.fill('fedcba98-7654-3210-fedc-ba9876543210');
    await systemConsolePage.mobileSecurity.save();
    await pw.waitUntil(async () => (await systemConsolePage.mobileSecurity.saveButton.textContent()) === 'Save');
    await systemConsolePage.sidebar.users.click();
    await systemConsolePage.users.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    await systemConsolePage.mobileSecurity.toBeVisible();
    await systemConsolePage.mobileSecurity.enableIntuneMAM.toBeTrue();
    expect(await systemConsolePage.mobileSecurity.tenantId.getValue()).toBe('abcdef01-2345-6789-abcd-ef0123456789');
    expect(await systemConsolePage.mobileSecurity.clientId.getValue()).toBe('fedcba98-7654-3210-fedc-ba9876543210');
});
test('should disable Intune inputs when toggle is off', async ({pw}) => {
    const {adminUser, adminClient} = await pw.initSetup();
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
    if (!adminUser) {
        throw new Error('Failed to create admin user');
    }
    const config = await adminClient.getConfig();
    config.Office365Settings.Enable = true;
    config.Office365Settings.Id = 'test-client-id';
    config.Office365Settings.Secret = 'test-secret';
    config.Office365Settings.DirectoryId = 'test-directory-id';
    await adminClient.updateConfig(config);
    const {systemConsolePage} = await pw.testBrowser.login(adminUser);
    await systemConsolePage.goto();
    await systemConsolePage.toBeVisible();
    await systemConsolePage.sidebar.mobileSecurity.click();
    expect(await systemConsolePage.mobileSecurity.authProvider.dropdown.isDisabled()).toBe(true);
    expect(await systemConsolePage.mobileSecurity.tenantId.input.isDisabled()).toBe(true);
    expect(await systemConsolePage.mobileSecurity.clientId.input.isDisabled()).toBe(true);
    await systemConsolePage.mobileSecurity.enableIntuneMAM.selectTrue();
    expect(await systemConsolePage.mobileSecurity.authProvider.dropdown.isDisabled()).toBe(false);
    expect(await systemConsolePage.mobileSecurity.tenantId.input.isDisabled()).toBe(false);
    expect(await systemConsolePage.mobileSecurity.clientId.input.isDisabled()).toBe(false);
});