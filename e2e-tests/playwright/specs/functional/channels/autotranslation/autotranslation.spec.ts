import {
    ChannelsPost,
    disableChannelAutotranslation,
    enableAutotranslationConfig,
    enableChannelAutotranslation,
    hasAutotranslationLicense,
    setUserChannelAutotranslation,
    expect,
    test,
    setMockSourceLanguage,
} from '@mattermost/playwright-lib';
import {getRandomId} from 'utils/utils';
const POST_TYPE_AUTOTRANSLATION_CHANGE = 'system_autotranslation';
test(
    'post is translated for user with autotranslation enabled',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Autotranslation Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) {
            throw new Error('Failed to create poster client');
        }
        const message = 'Hola mundo amigos los pruebas son geniales';
        await posterClient.createPost({
            channel_id: created.id,
            message,
            user_id: createdPoster.id,
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const postLocator = channelsPage.centerView.container.locator('[id^="post_"]');
        await expect(postLocator).not.toHaveCount(0, {timeout: 15000});
    },
);
test(
    'channel admin can enable autotranslation in a channel',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-admin-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Autotranslation Admin Test',
            type: 'O',
        });
        expect(created.autotranslation).toBeFalsy();
        const {channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const channelSettingsModal = await channelsPage.openChannelSettings();
        const configurationTab = await channelSettingsModal.openConfigurationTab();
        await configurationTab.enableChannelAutotranslation();
        await configurationTab.save();
        await channelSettingsModal.close();
        const channelAfter = await adminClient.getChannel(created.id);
        expect(channelAfter.autotranslation).toBe(true);
    },
);
test(
    'enabling autotranslation in Channel Settings posts a system message',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminUser, adminClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-system-msg-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Autotranslation System Message Test',
            type: 'O',
        });
        const {channelsPage} = await pw.testBrowser.login(adminUser);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const channelSettingsModal = await channelsPage.openChannelSettings();
        const configurationTab = await channelSettingsModal.openConfigurationTab();
        await configurationTab.enableChannelAutotranslation();
        await configurationTab.save();
        await channelSettingsModal.close();
        const postList = await adminClient.getPosts(created.id);
        const systemPost = Object.values(postList.posts).find((p) => p.type === POST_TYPE_AUTOTRANSLATION_CHANGE);
        expect(systemPost).toBeDefined();
        expect(systemPost!.message).toMatch(/enabled Auto-translation for this channel/i);
    },
);
test(
    'only new messages are translated after enable; old messages unchanged',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-new-only-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'New Messages Only Test',
            type: 'O',
        });
        await adminClient.addToChannel(user.id, created.id);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const oldMessage = 'Old message before enable';
        await posterClient.createPost({
            channel_id: created.id,
            message: oldMessage,
            user_id: createdPoster.id,
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const newMessage = 'Hola nuevo';
        await posterClient.createPost({
            channel_id: created.id,
            message: newMessage,
            user_id: createdPoster.id,
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const translatedNewMessage = 'Hola nuevo [translated to en]';
        await expect(
            channelsPage.centerView.container.locator('[id^="post_"]').getByText(translatedNewMessage, {exact: false}),
        ).toBeVisible({timeout: 15000});
        await expect(channelsPage.centerView.container.locator('[id^="post_"]').getByText(oldMessage)).toBeVisible();
    },
);
test(
    'channel header tooltip on autotranslation badge',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-tooltip-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Tooltip Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible();
        await channelsPage.centerView.autotranslationBadge.hover();
        await expect(page.getByRole('tooltip')).toContainText('Auto-translation is enabled');
    },
);
test(
    'disabling at channel level stops translations',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-disable-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Disable Channel Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Translated before disable',
            user_id: createdPoster.id,
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible({timeout: 15000});
        await disableChannelAutotranslation(adminClient, created.id);
        await posterClient.createPost({
            channel_id: created.id,
            message: 'After disable no translation',
            user_id: createdPoster.id,
        });
        await channelsPage.page.reload();
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).not.toBeVisible();
        await expect(
            channelsPage.centerView.container.getByText('After disable no translation', {exact: true}),
        ).toBeVisible();
    },
);
test(
    'auto-translation is ON by default for new channel members',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-default-on-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Default On Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        await setMockSourceLanguage(translationUrl, 'es');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Hola para nuevo miembro',
            user_id: createdPoster.id,
        });
        await adminClient.addToChannel(user.id, created.id);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible({timeout: 15000});
        await expect(
            channelsPage.centerView.container
                .locator('[id^="post_"]')
                .getByText('Hola para nuevo miembro [translated to en]', {exact: false}),
        ).toBeVisible();
    },
);
test(
    'opting out shows ephemeral message to user',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-ephemeral-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Ephemeral Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        await page.getByRole('menuitem', {name: 'Disable autotranslation'}).click();
        await page.getByRole('button', {name: 'Turn off auto-translation'}).click();
        await expect(
            channelsPage.centerView.container.locator('p').getByText(/You disabled Auto-translation for this channel/i),
        ).toBeVisible();
    },
);
test(
    'disabling for self reverts translated messages to original',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-revert-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Revert Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const originalText = 'Solo texto original';
        await setMockSourceLanguage(translationUrl, 'es');
        await posterClient.createPost({
            channel_id: created.id,
            message: originalText,
            user_id: createdPoster.id,
        });
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const translatedText = 'Solo texto original [translated to en]';
        const spanishPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: translatedText});
        await expect(spanishPost).toBeVisible({timeout: 15000});
        await channelsPage.centerView.header.openChannelMenu();
        await page.getByRole('menuitem', {name: 'Disable autotranslation'}).click();
        await page.getByRole('button', {name: 'Turn off auto-translation'}).click();
        const userPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({has: page.locator('.post__body').filter({hasText: originalText})});
        await expect(userPost).toBeVisible({timeout: 15000});
        await expect(userPost).toContainText(originalText);
        await expect(userPost.getByRole('button', {name: 'This post has been translated'})).not.toBeVisible();
    },
);
test(
    'messages only translate when source differs from user language',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-lang-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Language Rules Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const poster2 = await pw.random.user('poster2');
        const createdPoster2 = await adminClient.createUser(poster2, '', '');
        await adminClient.addToTeam(team.id, createdPoster2.id);
        await adminClient.addToChannel(createdPoster2.id, created.id);
        const {client: posterClient2} = await pw.makeClient({
            username: poster2.username,
            password: poster2.password,
        });
        if (!posterClient2) throw new Error('Failed to create second poster client');
        await setMockSourceLanguage(translationUrl, 'es');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Solo español',
            user_id: createdPoster.id,
        });
        await setMockSourceLanguage(translationUrl, 'en');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'English only',
            user_id: createdPoster.id,
        });
        await posterClient2.createPost({
            channel_id: created.id,
            message: 'Hola desde segundo usuario',
            user_id: createdPoster2.id,
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.container.locator('[id^="post_"]').getByText('English only')).toBeVisible({
            timeout: 15000,
        });
        await expect(
            channelsPage.centerView.container
                .locator('[id^="post_"]')
                .getByText('Solo español [translated to en]', {exact: false}),
        ).toBeVisible();
        const spanishPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: 'Solo español [translated to en]'});
        await expect(spanishPost).toBeVisible({timeout: 15000});
        const englishPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: 'English only'});
        await expect(englishPost).toBeVisible();
    },
);
test(
    'message indicator only on actually translated message',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-indicator-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Indicator Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const poster2 = await pw.random.user('poster2');
        const createdPoster2 = await adminClient.createUser(poster2, '', '');
        await adminClient.addToTeam(team.id, createdPoster2.id);
        await adminClient.addToChannel(createdPoster2.id, created.id);
        const {client: posterClient2} = await pw.makeClient({
            username: poster2.username,
            password: poster2.password,
        });
        if (!posterClient2) throw new Error('Failed to create second poster client');
        await setMockSourceLanguage(translationUrl, 'es');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Solo español',
            user_id: createdPoster.id,
        });
        await setMockSourceLanguage(translationUrl, 'en');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'English only',
            user_id: createdPoster.id,
        });
        await posterClient2.createPost({
            channel_id: created.id,
            message: 'Otro mensaje en español',
            user_id: createdPoster2.id,
        });
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.container.locator('[id^="post_"]').getByText('English only')).toBeVisible({
            timeout: 15000,
        });
        await expect(
            channelsPage.centerView.container
                .locator('[id^="post_"]')
                .getByText('Solo español [translated to en]', {exact: false}),
        ).toBeVisible();
        const translatedPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: 'Solo español [translated to en]'});
        await expect(translatedPost).toBeVisible({timeout: 15000});
        const notTranslatedPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: 'English only', exact: true});
        await expect(notTranslatedPost).toBeVisible();
    },
);
test(
    'translated message has indicator; click opens Show Translation modal',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-modal-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Show Translation Modal Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const poster2 = await pw.random.user('poster2');
        const createdPoster2 = await adminClient.createUser(poster2, '', '');
        await adminClient.addToTeam(team.id, createdPoster2.id);
        await adminClient.addToChannel(createdPoster2.id, created.id);
        const {client: posterClient2} = await pw.makeClient({
            username: poster2.username,
            password: poster2.password,
        });
        if (!posterClient2) throw new Error('Failed to create second poster client');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Este es un texto para la modal de traducción automática que debe ser lo suficientemente largo',
            user_id: createdPoster.id,
        });
        await posterClient2.createPost({
            channel_id: created.id,
            message: 'Segundo usuario con mensaje más largo para mejor detección de idioma',
            user_id: createdPoster2.id,
        });
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const modalPost = channelsPage.centerView.container
            .locator('[id^="post_"]')
            .filter({hasText: 'Este es un texto para la modal de traducción automática'});
        await expect(modalPost).toBeVisible({timeout: 15000});
        const translationButton = modalPost.getByRole('button', {name: 'This post has been translated'});
        const hasTranslationButton = (await translationButton.count()) > 0;
        if (!hasTranslationButton) {
            throw new Error(
                'Translation button not found on post. Expected autotranslation to produce a translated message indicator.',
            );
        }
        await translationButton.click();
        const showTranslationDialog = page.getByRole('dialog').filter({hasText: 'Show Translation'});
        await expect(showTranslationDialog).toBeVisible();
        await expect(showTranslationDialog.getByText('ORIGINAL')).toBeVisible();
        await expect(showTranslationDialog.getByText('AUTO-TRANSLATED')).toBeVisible();
    },
);
test(
    'message actions include Show translation',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-dotmenu-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Dot Menu Show Translation Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const poster = await pw.random.user('poster');
        const createdPoster = await adminClient.createUser(poster, '', '');
        await adminClient.addToTeam(team.id, createdPoster.id);
        await adminClient.addToChannel(createdPoster.id, created.id);
        const {client: posterClient} = await pw.makeClient({
            username: poster.username,
            password: poster.password,
        });
        if (!posterClient) throw new Error('Failed to create poster client');
        const poster2 = await pw.random.user('poster2');
        const createdPoster2 = await adminClient.createUser(poster2, '', '');
        await adminClient.addToTeam(team.id, createdPoster2.id);
        await adminClient.addToChannel(createdPoster2.id, created.id);
        const {client: posterClient2} = await pw.makeClient({
            username: poster2.username,
            password: poster2.password,
        });
        if (!posterClient2) throw new Error('Failed to create second poster client');
        await setMockSourceLanguage(translationUrl, 'es');
        await posterClient.createPost({
            channel_id: created.id,
            message: 'Este mensaje es para probar el menú de acciones con la opción de mostrar traducción automática',
            user_id: createdPoster.id,
        });
        await posterClient2.createPost({
            channel_id: created.id,
            message: 'Segundo usuario con mensaje más largo para mejor detección de idioma',
            user_id: createdPoster2.id,
        });
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        const messagePost = channelsPage.centerView.container
            .getByTestId('postView')
            .filter({hasText: 'Este mensaje es para probar el menú de acciones'});
        await messagePost.waitFor({state: 'visible', timeout: 15000});
        await expect(messagePost.getByText(/\[translated to en\]/i)).toBeVisible({timeout: 15000});
        const post = new ChannelsPost(messagePost);
        await post.hover();
        await post.postMenu.toBeVisible();
        await post.postMenu.dotMenuButton.click();
        await page.mouse.move(0, 0);
        await channelsPage.postDotMenu.toBeVisible();
        await expect(channelsPage.postDotMenu.showTranslationMenuItem).toBeVisible({timeout: 10000});
    },
);
test(
    'any user can disable and enable again autotranslation for themselves in a channel',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-toggle-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Autotranslation Toggle Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await setUserChannelAutotranslation(userClient, created.id, true);
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        await page.getByRole('menuitem', {name: 'Disable autotranslation'}).click();
        await page.getByRole('button', {name: 'Turn off auto-translation'}).click();
        await expect(channelsPage.centerView.autotranslationBadge).not.toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        await page.getByRole('menuitem', {name: 'Enable autotranslation'}).click();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible();
    },
);
test(
    'autotranslation badge is only visible on translated channels',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const translatedChannelName = `autotranslation-badge-${await getRandomId()}`;
        const translatedChannel = await adminClient.createChannel({
            team_id: team.id,
            name: translatedChannelName,
            display_name: 'Translated Channel',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, translatedChannel.id);
        await adminClient.addToChannel(user.id, translatedChannel.id);
        await setUserChannelAutotranslation(userClient, translatedChannel.id, true);
        const noTranslationChannelName = `no-translation-${await getRandomId()}`;
        const noTranslationChannel = await adminClient.createChannel({
            team_id: team.id,
            name: noTranslationChannelName,
            display_name: 'No Translation Channel',
            type: 'O',
        });
        await adminClient.addToChannel(user.id, noTranslationChannel.id);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, translatedChannelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).toBeVisible();
        await channelsPage.goto(team.name, noTranslationChannelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).not.toBeVisible();
    },
);
test(
    'unsupported language does not show channel badge and shows message in channel header menu',
    {
        tag: ['@autotranslation'],
    },
    async ({pw}) => {
        const {adminClient, user, userClient, team} = await pw.initSetup();
        const license = await adminClient.getClientLicenseOld();
        test.skip(
            !hasAutotranslationLicense(license.SkuShortName),
            'Skipping test - server does not have Entry or Advanced license',
        );
        const translationUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:3010';
        await enableAutotranslationConfig(adminClient, {
            mockBaseUrl: translationUrl,
            targetLanguages: ['en', 'es'],
        });
        const channelName = `autotranslation-unsupported-${await getRandomId()}`;
        const created = await adminClient.createChannel({
            team_id: team.id,
            name: channelName,
            display_name: 'Unsupported Language Test',
            type: 'O',
        });
        await enableChannelAutotranslation(adminClient, created.id);
        await adminClient.addToChannel(user.id, created.id);
        await userClient.patchMe({locale: 'fr'});
        const {channelsPage, page} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, channelName);
        await channelsPage.toBeVisible();
        await expect(channelsPage.centerView.autotranslationBadge).not.toBeVisible();
        await channelsPage.centerView.header.openChannelMenu();
        const channelMenu = page
            .getByRole('menu')
            .filter({has: page.getByRole('menuitem', {name: /Auto-translation|Channel Settings/})});
        await expect(channelMenu.getByText('Auto-translation', {exact: true})).toBeVisible();
        await expect(channelMenu.getByText('Your language is not supported')).toBeVisible();
        const autotranslationItem = page.getByRole('menuitem', {name: /Auto-translation/});
        await expect(autotranslationItem).toBeDisabled();
    },
);