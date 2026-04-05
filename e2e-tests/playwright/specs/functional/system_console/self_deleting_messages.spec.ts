import {expect, test} from '@mattermost/playwright-lib';
test.describe('System Console > Self-Deleting Messages', () => {
    test('admin can enable and disable self-deleting messages', async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        await expect(postsSection).toBeVisible();
        const enableToggleTrue = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadtrue');
        const enableToggleFalse = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadfalse');
        const durationDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadDurationSecondsdropdown');
        const maxTTLDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadMaximumTimeToLiveSecondsdropdown');
        const saveButton = postsSection.getByRole('button', {name: 'Save'});
        if (await enableToggleTrue.isChecked()) {
            await enableToggleFalse.click();
            await saveButton.click();
            await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        }
        expect(await durationDropdown.isDisabled()).toBe(true);
        expect(await maxTTLDropdown.isDisabled()).toBe(true);
        await enableToggleTrue.click();
        expect(await enableToggleTrue.isChecked()).toBe(true);
        expect(await durationDropdown.isDisabled()).toBe(false);
        expect(await maxTTLDropdown.isDisabled()).toBe(false);
        await saveButton.click();
        await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        await systemConsolePage.sidebar.userManagement.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        expect(await enableToggleTrue.isChecked()).toBe(true);
    });
    test('admin can configure message duration', async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = true;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const durationDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadDurationSecondsdropdown');
        const saveButton = postsSection.getByRole('button', {name: 'Save'});
        await durationDropdown.selectOption('60');
        await saveButton.click();
        await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        await systemConsolePage.sidebar.userManagement.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        expect(await durationDropdown.inputValue()).toBe('60');
    });
    test('admin can configure maximum time to live', async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = true;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const maxTTLDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadMaximumTimeToLiveSecondsdropdown');
        const saveButton = postsSection.getByRole('button', {name: 'Save'});
        await maxTTLDropdown.selectOption('86400');
        await saveButton.click();
        await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        await systemConsolePage.sidebar.userManagement.users.click();
        await systemConsolePage.users.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        expect(await maxTTLDropdown.inputValue()).toBe('86400');
    });
    test('dropdowns are disabled when feature is disabled', async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = false;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const enableToggleTrue = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadtrue');
        const enableToggleFalse = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadfalse');
        const durationDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadDurationSecondsdropdown');
        const maxTTLDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadMaximumTimeToLiveSecondsdropdown');
        expect(await enableToggleFalse.isChecked()).toBe(true);
        expect(await durationDropdown.isDisabled()).toBe(true);
        expect(await maxTTLDropdown.isDisabled()).toBe(true);
        await enableToggleTrue.click();
        expect(await durationDropdown.isDisabled()).toBe(false);
        expect(await maxTTLDropdown.isDisabled()).toBe(false);
        await enableToggleFalse.click();
        expect(await durationDropdown.isDisabled()).toBe(true);
        expect(await maxTTLDropdown.isDisabled()).toBe(true);
    });
    test('settings persist after page reload', async ({pw}) => {
        const {adminUser, adminClient} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = true;
        config.ServiceSettings.BurnOnReadDurationSeconds = 300;
        config.ServiceSettings.BurnOnReadMaximumTimeToLiveSeconds = 259200;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const enableToggleTrue = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadtrue');
        const durationDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadDurationSecondsdropdown');
        const maxTTLDropdown = postsSection.getByTestId('ServiceSettings.BurnOnReadMaximumTimeToLiveSecondsdropdown');
        expect(await enableToggleTrue.isChecked()).toBe(true);
        expect(await durationDropdown.inputValue()).toBe('300');
        expect(await maxTTLDropdown.inputValue()).toBe('259200');
        await page.goto('/admin_console/site_config/posts');
        await page.waitForLoadState('networkidle');
        expect(await enableToggleTrue.isChecked()).toBe(true);
        expect(await durationDropdown.inputValue()).toBe('300');
        expect(await maxTTLDropdown.inputValue()).toBe('259200');
    });
    test('BoR toggle appears in channels when feature is enabled in System Console', async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = false;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const enableToggleTrue = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadtrue');
        const saveButton = postsSection.getByRole('button', {name: 'Save'});
        await enableToggleTrue.click();
        await saveButton.click();
        await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        await page.goto(`/${team.name}/channels/off-topic`);
        await page.waitForLoadState('networkidle');
        const borButton = page.getByRole('button', {name: /Burn-on-read/i});
        await expect(borButton).toBeVisible({timeout: 10000});
    });
    test('BoR toggle is hidden when feature is disabled in System Console', async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = true;
        await adminClient.patchConfig(config);
        const {systemConsolePage, page} = await pw.testBrowser.login(adminUser);
        await systemConsolePage.goto();
        await systemConsolePage.toBeVisible();
        await systemConsolePage.sidebar.siteConfiguration.posts.click();
        await page.waitForLoadState('networkidle');
        const postsSection = page.getByTestId('sysconsole_section_PostSettings');
        const enableToggleFalse = postsSection.getByTestId('ServiceSettings.EnableBurnOnReadfalse');
        const saveButton = postsSection.getByRole('button', {name: 'Save'});
        await enableToggleFalse.click();
        await saveButton.click();
        await pw.waitUntil(async () => (await saveButton.textContent()) === 'Save');
        await page.goto(`/${team.name}/channels/off-topic`);
        await page.waitForLoadState('networkidle');
        const borButton = page.getByRole('button', {name: /Burn-on-read/i});
        await expect(borButton).not.toBeVisible({timeout: 5000});
    });
    test('configured duration affects timer countdown in channels', async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            license.SkuShortName !== 'advanced' && license.short_sku_name !== 'advanced',
            'Skipping test - server does not have enterprise advanced license',
        );
        if (!adminUser) {
            throw new Error('Failed to create admin user');
        }
        const config = await adminClient.getConfig();
        config.ServiceSettings.EnableBurnOnRead = true;
        config.ServiceSettings.BurnOnReadDurationSeconds = 300;
        config.ServiceSettings.BurnOnReadMaximumTimeToLiveSeconds = 604800;
        await adminClient.patchConfig(config);
        const randomUser = await pw.random.user();
        const receiver = await adminClient.createUser(randomUser, '', '');
        (receiver as any).password = randomUser.password;
        await adminClient.addToTeam(team.id, receiver.id);
        const channelName = `bor-test-${Date.now().toString(36)}`;
        const channel = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: `BoR Duration Test ${channelName}`,
            type: 'P',
        } as any);
        await adminClient.addToChannel(receiver.id, channel.id);
        const {channelsPage: senderChannelsPage} = await pw.testBrowser.login(adminUser);
        await senderChannelsPage.goto(team.name, channelName);
        await senderChannelsPage.toBeVisible();
        await senderChannelsPage.centerView.postCreate.toggleBurnOnRead();
        const messageContent = `Duration test ${Date.now()}`;
        await senderChannelsPage.postMessage(messageContent);
        const {channelsPage: receiverChannelsPage, page: receiverPage} = await pw.testBrowser.login(receiver as any);
        await receiverChannelsPage.goto(team.name, channelName);
        await receiverChannelsPage.toBeVisible();
        const concealedPlaceholder = receiverPage.locator('.BurnOnReadConcealedPlaceholder').first();
        await expect(concealedPlaceholder).toBeVisible({timeout: 10000});
        await expect(concealedPlaceholder).not.toHaveClass(/BurnOnReadConcealedPlaceholder--loading/, {timeout: 10000});
        await expect(concealedPlaceholder).toBeEnabled({timeout: 5000});
        await concealedPlaceholder.click();
        const confirmModal = receiverPage.locator('.BurnOnReadConfirmationModal');
        if (await confirmModal.isVisible({timeout: 2000}).catch(() => false)) {
            const confirmButton = confirmModal.getByRole('button', {name: /reveal/i});
            await confirmButton.click();
        }
        const timerChip = receiverPage.locator('.BurnOnReadTimerChip').first();
        await expect(timerChip).toBeVisible({timeout: 15000});
        const timerText = await timerChip.textContent();
        const match = timerText?.match(/(\d+):(\d{2})/);
        expect(match).not.toBeNull();
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const totalSeconds = minutes * 60 + seconds;
            expect(totalSeconds).toBeGreaterThanOrEqual(250);
            expect(totalSeconds).toBeLessThanOrEqual(300);
        }
    });
});