import {expect, test} from '@mattermost/playwright-lib';
const OBFUSCATED_SLUG_RE = /^[a-z0-9]{26}$/;
async function skipIfNoAdvancedLicense(adminClient: any) {
    const license = await adminClient.getClientLicenseOld();
    test.skip(license.SkuShortName !== 'advanced', 'Skipping test - server does not have enterprise advanced license');
}
async function setAnonymousUrls(adminClient: any, enabled: boolean) {
    await adminClient.patchConfig({
        PrivacySettings: {
            UseAnonymousURLs: enabled,
        },
    });
}
function expectObfuscatedSlug(slug: string) {
    expect(slug).toMatch(OBFUSCATED_SLUG_RE);
}
function expectReadableSlug(slug: string, expectedSlug?: string) {
    if (expectedSlug) {
        expect(slug).toBe(expectedSlug);
    }
    expect(slug).not.toMatch(OBFUSCATED_SLUG_RE);
}
async function createChannelFromUI(channelsPage: any, displayName: string) {
    const newChannelModal = await channelsPage.openNewChannelModal();
    await newChannelModal.fillDisplayName(displayName);
    await newChannelModal.create();
    await channelsPage.toBeVisible();
}
async function createTeamFromUI(channelsPage: any, displayName: string) {
    const createTeamForm = await channelsPage.openCreateTeamForm();
    await createTeamForm.fillTeamName(displayName);
    await createTeamForm.submitDisplayName();
    await channelsPage.toBeVisible();
}
async function getChannelByDisplayName(adminClient: any, teamId: string, displayName: string) {
    const channels = await adminClient.getChannels(teamId);
    const channel = channels.find((candidate: any) => candidate.display_name === displayName);
    expect(channel).toBeDefined();
    return channel!;
}
async function getTeamByDisplayName(adminClient: any, displayName: string) {
    const teams = await adminClient.getMyTeams();
    const team = teams.find((candidate: any) => candidate.display_name === displayName);
    expect(team).toBeDefined();
    return team!;
}
async function createAnonymousUrlChannel(
    channelsPage: any,
    adminClient: any,
    teamName: string,
    teamId: string,
    displayName: string,
) {
    await createChannelFromUI(channelsPage, displayName);
    await channelsPage.centerView.header.toHaveTitle(displayName);
    const channel = await getChannelByDisplayName(adminClient, teamId, displayName);
    expectObfuscatedSlug(channel.name);
    await expect(channelsPage.page).toHaveURL(new RegExp(`/${teamName}/channels/${channel.name}$`));
    return channel;
}
test.describe('Anonymous URLs', () => {
    test(
        'enables anonymous URLs setting from System Console and verifies it persists',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient} = await pw.initSetup({withDefaultProfileImage: false});
            const license = await adminClient.getClientLicenseOld();
            test.skip(
                license.SkuShortName !== 'advanced',
                'Skipping test - server does not have enterprise advanced license',
            );
            const {systemConsolePage} = await pw.testBrowser.login(adminUser);
            await systemConsolePage.goto();
            await systemConsolePage.toBeVisible();
            await systemConsolePage.sidebar.siteConfiguration.usersAndTeams.click();
            await systemConsolePage.usersAndTeams.toBeVisible();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.toBeVisible();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.toBeFalse();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.selectTrue();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.toBeTrue();
            await systemConsolePage.usersAndTeams.save();
            await pw.waitUntil(async () => (await systemConsolePage.usersAndTeams.saveButton.textContent()) === 'Save');
            await systemConsolePage.sidebar.siteConfiguration.notifications.click();
            await systemConsolePage.notifications.toBeVisible();
            await systemConsolePage.sidebar.siteConfiguration.usersAndTeams.click();
            await systemConsolePage.usersAndTeams.toBeVisible();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.toBeTrue();
            await systemConsolePage.usersAndTeams.useAnonymousURLs.selectFalse();
            await systemConsolePage.usersAndTeams.save();
            await pw.waitUntil(async () => (await systemConsolePage.usersAndTeams.saveButton.textContent()) === 'Save');
        },
    );
    test(
        'hides channel URL editor when creating new channel with anonymous URLs enabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient} = await pw.initSetup({withDefaultProfileImage: false});
            const license = await adminClient.getClientLicenseOld();
            test.skip(
                license.SkuShortName !== 'advanced',
                'Skipping test - server does not have enterprise advanced license',
            );
            await setAnonymousUrls(adminClient, true);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            await channelsPage.sidebarLeft.browseOrCreateChannelButton.click();
            await channelsPage.page.locator('#createNewChannelMenuItem').click();
            await channelsPage.newChannelModal.toBeVisible();
            await channelsPage.newChannelModal.fillDisplayName('Anonymous Test Channel');
            await expect(channelsPage.newChannelModal.urlSection).not.toBeVisible();
            await channelsPage.newChannelModal.cancel();
        },
    );
    test(
        'creates channel with obfuscated URL slug when anonymous URLs enabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            const license = await adminClient.getClientLicenseOld();
            test.skip(
                license.SkuShortName !== 'advanced',
                'Skipping test - server does not have enterprise advanced license',
            );
            await setAnonymousUrls(adminClient, true);
            await adminClient.addToTeam(team.id, adminUser.id);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto(team.name);
            await channelsPage.toBeVisible();
            const channelDisplayName = 'Obfuscated Channel ' + Date.now();
            await channelsPage.sidebarLeft.browseOrCreateChannelButton.click();
            await channelsPage.page.locator('#createNewChannelMenuItem').click();
            await channelsPage.newChannelModal.toBeVisible();
            await channelsPage.newChannelModal.fillDisplayName(channelDisplayName);
            await channelsPage.newChannelModal.create();
            await channelsPage.toBeVisible();
            await pw.wait(pw.duration.two_sec);
            const allChannels = await adminClient.getChannels(team.id);
            const createdChannel = allChannels.find((ch) => ch.display_name === channelDisplayName);
            expect(createdChannel).toBeDefined();
            const humanReadableSlug = channelDisplayName.toLowerCase().replace(/\s+/g, '-');
            expect(createdChannel!.name).not.toBe(humanReadableSlug);
            expect(createdChannel!.name).toMatch(/^[a-z0-9]{26}$/);
            expect(createdChannel!.display_name).toBe(channelDisplayName);
        },
    );
    test(
        'shows channel URL editor when creating new channel with anonymous URLs disabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser} = await pw.initSetup({withDefaultProfileImage: false});
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            await channelsPage.sidebarLeft.browseOrCreateChannelButton.click();
            await channelsPage.page.locator('#createNewChannelMenuItem').click();
            await channelsPage.newChannelModal.toBeVisible();
            await channelsPage.newChannelModal.fillDisplayName('Test Channel URL');
            await expect(channelsPage.newChannelModal.urlSection).toBeVisible();
            await channelsPage.newChannelModal.cancel();
        },
    );
    test(
        'skips team URL step when creating team with anonymous URLs enabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient} = await pw.initSetup({withDefaultProfileImage: false});
            const license = await adminClient.getClientLicenseOld();
            test.skip(
                license.SkuShortName !== 'advanced',
                'Skipping test - server does not have enterprise advanced license',
            );
            await setAnonymousUrls(adminClient, true);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            await channelsPage.sidebarLeft.teamMenuButton.click();
            await channelsPage.teamMenu.toBeVisible();
            await channelsPage.teamMenu.clickCreateTeam();
            await channelsPage.createTeamForm.toBeVisible();
            await expect(channelsPage.createTeamForm.teamNameInput).toBeVisible();
            await expect(channelsPage.createTeamForm.teamNameSubmitButton).toContainText('Create');
            const teamName = 'Anonymous Team ' + Date.now();
            await channelsPage.createTeamForm.fillTeamName(teamName);
            await channelsPage.createTeamForm.submitDisplayName();
            await channelsPage.toBeVisible();
            const teams = await adminClient.getMyTeams();
            const createdTeam = teams.find((t) => t.display_name === teamName);
            expect(createdTeam).toBeDefined();
            expect(createdTeam!.name).toMatch(/^[a-z0-9]{26}$/);
        },
    );
    test(
        'shows team URL step when creating team with anonymous URLs disabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser} = await pw.initSetup({withDefaultProfileImage: false});
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            await channelsPage.sidebarLeft.teamMenuButton.click();
            await channelsPage.teamMenu.toBeVisible();
            await channelsPage.teamMenu.clickCreateTeam();
            await channelsPage.createTeamForm.toBeVisible();
            await expect(channelsPage.createTeamForm.teamNameSubmitButton).toContainText('Next');
            await channelsPage.createTeamForm.fillTeamName('Test Team URL Step');
            await channelsPage.createTeamForm.submitDisplayName();
            await expect(channelsPage.createTeamForm.teamURLInput).toBeVisible();
            await expect(channelsPage.createTeamForm.teamURLSubmitButton).toBeVisible();
            await expect(channelsPage.createTeamForm.teamURLSubmitButton).toContainText('Finish');
        },
    );
    test(
        'preserves archived anonymous channel routes and restores channel access after unarchive',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            await adminClient.addToTeam(team.id, adminUser.id);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto(team.name);
            await channelsPage.toBeVisible();
            const channelDisplayName = `Archived Anonymous ${await pw.random.id()}`;
            await createChannelFromUI(channelsPage, channelDisplayName);
            const createdChannel = await getChannelByDisplayName(adminClient, team.id, channelDisplayName);
            expectObfuscatedSlug(createdChannel.name);
            await adminClient.deleteChannel(createdChannel.id);
            const archivedChannel = await adminClient.getChannel(createdChannel.id);
            expect(archivedChannel.name).toBe(createdChannel.name);
            const restoredChannel = await adminClient.unarchiveChannel(createdChannel.id);
            expect(restoredChannel.name).toBe(createdChannel.name);
            await channelsPage.page.reload();
            await channelsPage.sidebarLeft.goToItem(createdChannel.name);
            await channelsPage.centerView.header.toHaveTitle(channelDisplayName);
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${createdChannel.name}`);
        },
    );
    test(
        'keeps existing readable routes unchanged and obfuscates only newly created channels and teams',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await adminClient.addToTeam(team.id, adminUser.id);
            const legacyChannelSlug = `legacy-channel-${await pw.random.id()}`;
            const legacyChannelDisplayName = `Legacy Channel ${await pw.random.id()}`;
            const legacyChannel = await adminClient.createChannel({
                team_id: team.id,
                name: legacyChannelSlug,
                display_name: legacyChannelDisplayName,
                type: 'O',
            });
            const legacyTeamSlug = `legacy-team-${await pw.random.id()}`;
            const legacyTeamDisplayName = `Legacy Team ${await pw.random.id()}`;
            const legacyTeam = await adminClient.createTeam({
                name: legacyTeamSlug,
                display_name: legacyTeamDisplayName,
                type: 'O',
            } as any);
            expectReadableSlug(legacyChannel.name, legacyChannelSlug);
            expectReadableSlug(legacyTeam.name, legacyTeamSlug);
            await setAnonymousUrls(adminClient, true);
            const legacyChannelAfterToggle = await adminClient.getChannel(legacyChannel.id);
            const legacyTeamAfterToggle = await adminClient.getTeam(legacyTeam.id);
            expectReadableSlug(legacyChannelAfterToggle.name, legacyChannelSlug);
            expectReadableSlug(legacyTeamAfterToggle.name, legacyTeamSlug);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto(team.name, legacyChannelSlug);
            await channelsPage.toBeVisible();
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${legacyChannelSlug}`);
            const anonymousChannelDisplayName = `Anonymous Channel ${await pw.random.id()}`;
            await channelsPage.goto(team.name);
            await channelsPage.toBeVisible();
            await createChannelFromUI(channelsPage, anonymousChannelDisplayName);
            const anonymousChannel = await getChannelByDisplayName(adminClient, team.id, anonymousChannelDisplayName);
            expectObfuscatedSlug(anonymousChannel.name);
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${anonymousChannel.name}`);
            const anonymousTeamDisplayName = `Anonymous Team ${await pw.random.id()}`;
            await createTeamFromUI(channelsPage, anonymousTeamDisplayName);
            const anonymousTeam = await getTeamByDisplayName(adminClient, anonymousTeamDisplayName);
            expectObfuscatedSlug(anonymousTeam.name);
            await expect(channelsPage.page).toHaveURL(new RegExp(`/${anonymousTeam.name}/`));
        },
    );
    test(
        'keeps direct and group message routes readable when anonymous URLs are enabled',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            await adminClient.addToTeam(team.id, adminUser.id);
            const secondUser = await pw.createNewUserProfile(adminClient, {prefix: 'anonymousurlsdm'});
            const thirdUser = await pw.createNewUserProfile(adminClient, {prefix: 'anonymousurlsgm'});
            await adminClient.addToTeam(team.id, secondUser.id);
            await adminClient.addToTeam(team.id, thirdUser.id);
            const dmChannel = await adminClient.createDirectChannel([adminUser.id, secondUser.id]);
            const gmChannel = await adminClient.createGroupChannel([adminUser.id, secondUser.id, thirdUser.id]);
            const dmMessage = `Anonymous URL DM ${await pw.random.id()}`;
            const gmMessage = `Anonymous URL GM ${await pw.random.id()}`;
            await adminClient.createPost({channel_id: dmChannel.id, message: dmMessage});
            await adminClient.createPost({channel_id: gmChannel.id, message: gmMessage});
            expect(dmChannel.type).toBe('D');
            expect(gmChannel.type).toBe('G');
            expectReadableSlug(dmChannel.name);
            expectReadableSlug(gmChannel.name);
            expect(dmChannel.name).toContain(adminUser.id);
            expect(dmChannel.name).toContain(secondUser.id);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto(team.name, `@${secondUser.username}`);
            await channelsPage.toBeVisible();
            await expect(channelsPage.page).toHaveURL(`/${team.name}/messages/@${secondUser.username}`);
            await channelsPage.centerView.waitUntilLastPostContains(dmMessage);
            await channelsPage.gotoMessage(team.name, gmChannel.name);
            await channelsPage.toBeVisible();
            await expect(channelsPage.page).toHaveURL(`/${team.name}/messages/${gmChannel.name}`);
            await channelsPage.centerView.waitUntilLastPostContains(gmMessage);
        },
    );
    test(
        'renames an anonymous URL channel without changing its obfuscated route',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            await adminClient.addToTeam(team.id, adminUser.id);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto(team.name);
            await channelsPage.toBeVisible();
            const originalDisplayName = `Original Channel ${await pw.random.id()}`;
            await createChannelFromUI(channelsPage, originalDisplayName);
            const createdChannel = await getChannelByDisplayName(adminClient, team.id, originalDisplayName);
            const originalSlug = createdChannel.name;
            expectObfuscatedSlug(originalSlug);
            const renamedDisplayName = `Renamed Channel ${await pw.random.id()}`;
            const channelSettingsModal = await channelsPage.openChannelSettings();
            const infoTab = await channelSettingsModal.openInfoTab();
            await infoTab.updateName(renamedDisplayName);
            await channelSettingsModal.save();
            await pw.waitUntil(
                async () => (await adminClient.getChannel(createdChannel.id)).display_name === renamedDisplayName,
            );
            await channelSettingsModal.close();
            const renamedChannel = await adminClient.getChannel(createdChannel.id);
            expect(renamedChannel.display_name).toBe(renamedDisplayName);
            expect(renamedChannel.name).toBe(originalSlug);
            expectObfuscatedSlug(renamedChannel.name);
            await channelsPage.goto(team.name, originalSlug);
            await channelsPage.toBeVisible();
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${originalSlug}`);
            await channelsPage.centerView.header.toHaveTitle(renamedDisplayName);
        },
    );
    test(
        'renames an anonymous URL team without changing its obfuscated route',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            const {channelsPage} = await pw.testBrowser.login(adminUser);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            const originalTeamDisplayName = `Original Team ${await pw.random.id()}`;
            await createTeamFromUI(channelsPage, originalTeamDisplayName);
            const createdTeam = await getTeamByDisplayName(adminClient, originalTeamDisplayName);
            const originalTeamSlug = createdTeam.name;
            expectObfuscatedSlug(originalTeamSlug);
            const renamedTeamDisplayName = `Renamed Team ${await pw.random.id()}`;
            const teamSettingsModal = await channelsPage.openTeamSettings();
            const infoTab = await teamSettingsModal.openInfoTab();
            await infoTab.updateName(renamedTeamDisplayName);
            await teamSettingsModal.save();
            await pw.waitUntil(
                async () => (await adminClient.getTeam(createdTeam.id)).display_name === renamedTeamDisplayName,
            );
            await teamSettingsModal.close();
            const renamedTeam = await adminClient.getTeam(createdTeam.id);
            expect(renamedTeam.display_name).toBe(renamedTeamDisplayName);
            expect(renamedTeam.name).toBe(originalTeamSlug);
            expectObfuscatedSlug(renamedTeam.name);
            await channelsPage.goto(originalTeamSlug);
            await channelsPage.toBeVisible();
            await expect(channelsPage.page).toHaveURL(new RegExp(`/${originalTeamSlug}/`));
            const reopenedTeamSettings = await channelsPage.openTeamSettings();
            await expect(reopenedTeamSettings.infoSettings.nameInput).toHaveValue(renamedTeamDisplayName);
            await reopenedTeamSettings.close();
        },
    );
    test(
        'opens anonymous channel permalinks before and after disabling anonymous URLs',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminClient, team, user} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            const {channelsPage} = await pw.testBrowser.login(user);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            const displayName = `Permalink Channel ${await pw.random.id()}`;
            const channel = await createAnonymousUrlChannel(channelsPage, adminClient, team.name, team.id, displayName);
            const message = `Anonymous permalink message ${await pw.random.id()}`;
            await channelsPage.postMessage(message);
            const lastPost = await channelsPage.getLastPost();
            const postId = await lastPost.getId();
            const permalink = `/${team.name}/pl/${postId}`;
            await channelsPage.page.goto(permalink);
            await channelsPage.centerView.header.toHaveTitle(displayName);
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${channel.name}`);
            await channelsPage.centerView.waitUntilPostWithIdContains(postId, message);
            await setAnonymousUrls(adminClient, false);
            await channelsPage.page.goto(permalink);
            await channelsPage.centerView.header.toHaveTitle(displayName);
            await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${channel.name}`);
            await channelsPage.centerView.waitUntilPostWithIdContains(postId, message);
        },
    );
    test('channel search finds channels with obfuscated URLs', {tag: '@anonymous_urls'}, async ({pw}) => {
        const {adminClient, team, user} = await pw.initSetup({withDefaultProfileImage: false});
        await skipIfNoAdvancedLicense(adminClient);
        await setAnonymousUrls(adminClient, true);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const createdChannels = [];
        for (let i = 1; i <= 3; i++) {
            const displayName = `Search Test Channel ${i} ${await pw.random.id()}`;
            const channel = await createAnonymousUrlChannel(channelsPage, adminClient, team.name, team.id, displayName);
            createdChannels.push({channel, displayName});
        }
        const targetChannel = createdChannels[0];
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.sidebarLeft.findChannelButton.click();
        await channelsPage.findChannelsModal.toBeVisible();
        await channelsPage.findChannelsModal.input.fill(targetChannel.displayName.substring(0, 15));
        const result = channelsPage.findChannelsModal.getResult(targetChannel.channel.name);
        await expect(result).toBeVisible();
        await expect(result).toContainText(targetChannel.displayName);
        await channelsPage.findChannelsModal.selectChannel(targetChannel.channel.name);
        await channelsPage.centerView.header.toHaveTitle(targetChannel.displayName);
        await expect(channelsPage.page).toHaveURL(`/${team.name}/channels/${targetChannel.channel.name}`);
    });
    test('navigates post search results back to anonymous URL channels', {tag: '@anonymous_urls'}, async ({pw}) => {
        const {adminClient, team, user} = await pw.initSetup({withDefaultProfileImage: false});
        await skipIfNoAdvancedLicense(adminClient);
        await setAnonymousUrls(adminClient, true);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto();
        await channelsPage.toBeVisible();
        const displayName = `Search Channel ${await pw.random.id()}`;
        const channel = await createAnonymousUrlChannel(channelsPage, adminClient, team.name, team.id, displayName);
        const message = `AnonymousSearchableMessage${await pw.random.id()}`;
        await channelsPage.postMessage(message);
        const lastPost = await channelsPage.getLastPost();
        const postId = await lastPost.getId();
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.globalHeader.openSearch();
        await channelsPage.searchBox.searchInput.fill(message);
        await channelsPage.searchBox.searchInput.press('Enter');
        const searchItem = channelsPage.page.getByTestId('search-item-container').first();
        await expect(searchItem).toContainText(message, {timeout: 15000});
        await searchItem.getByRole('link', {name: 'Jump'}).click();
        await channelsPage.centerView.header.toHaveTitle(displayName);
        await expect(channelsPage.page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}`));
        await channelsPage.centerView.waitUntilPostWithIdContains(postId, message);
    });
    test(
        'creates anonymous URL channels from unicode and emoji display names and keeps them discoverable',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {user, adminClient, team} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            await setAnonymousUrls(adminClient, true);
            const {channelsPage} = await pw.testBrowser.login(user);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            const channelTemplates = ['Design review 🚀', 'Roadmap 中文', 'Support & Ops عربى'];
            const createdChannels = [];
            for (const template of channelTemplates) {
                const displayName = `${template} ${(await pw.random.id()).slice(0, 6)}`;
                const channel = await createAnonymousUrlChannel(
                    channelsPage,
                    adminClient,
                    team.name,
                    team.id,
                    displayName,
                );
                createdChannels.push({channel, displayName});
                const message = `anonymous-url edge case ${displayName}`;
                await channelsPage.postMessage(message);
                const lastPost = await channelsPage.getLastPost();
                await expect(lastPost.body).toContainText(message);
                await channelsPage.centerView.header.toHaveTitle(displayName);
                await expect(channelsPage.page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}$`));
            }
            const searchableChannel = createdChannels[1];
            await channelsPage.goto(team.name, 'town-square');
            await channelsPage.toBeVisible();
            await channelsPage.sidebarLeft.findChannelButton.click();
            await channelsPage.findChannelsModal.toBeVisible();
            await channelsPage.findChannelsModal.input.fill(searchableChannel.displayName);
            await expect(channelsPage.findChannelsModal.getResult(searchableChannel.channel.name)).toBeVisible();
            await channelsPage.findChannelsModal.selectChannel(searchableChannel.channel.name);
            await channelsPage.centerView.header.toHaveTitle(searchableChannel.displayName);
            await expect(channelsPage.page).toHaveURL(
                new RegExp(`/${team.name}/channels/${searchableChannel.channel.name}$`),
            );
        },
    );
    test(
        'shows calls entry point in anonymous URL channels with special-character names and preserves the obfuscated route',
        {tag: '@anonymous_urls'},
        async ({pw}) => {
            const {adminUser, adminClient, team, user} = await pw.initSetup({withDefaultProfileImage: false});
            await skipIfNoAdvancedLicense(adminClient);
            const pluginStatuses = await adminClient.getPluginStatuses();
            test.skip(
                !pluginStatuses.some((plugin: {plugin_id: string}) => plugin.plugin_id === 'com.mattermost.calls'),
                'Skipping test - Calls plugin is not installed',
            );
            await pw.ensurePluginsLoaded(['com.mattermost.calls']);
            await pw.shouldHaveCallsEnabled();
            await setAnonymousUrls(adminClient, true);
            await adminClient.addToTeam(team.id, adminUser.id);
            const {channelsPage} = await pw.testBrowser.login(user);
            await channelsPage.goto();
            await channelsPage.toBeVisible();
            const displayName = `Calls & Planning 🚀 ${(await pw.random.id()).slice(0, 6)}`;
            const channel = await createAnonymousUrlChannel(channelsPage, adminClient, team.name, team.id, displayName);
            await adminClient.addToChannel(adminUser.id, channel.id);
            await channelsPage.centerView.header.toHaveTitle(displayName);
            await expect(channelsPage.centerView.header.callButton).toBeVisible();
            const {channelsPage: otherChannelsPage} = await pw.testBrowser.login(adminUser);
            await otherChannelsPage.goto(team.name, channel.name);
            await otherChannelsPage.toBeVisible();
            await otherChannelsPage.centerView.header.toHaveTitle(displayName);
            await expect(otherChannelsPage.page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}$`));
            await expect(otherChannelsPage.centerView.header.callButton).toBeVisible();
            await otherChannelsPage.centerView.header.openCalls();
            await otherChannelsPage.centerView.header.toHaveTitle(displayName);
            await expect(otherChannelsPage.page).toHaveURL(new RegExp(`/${team.name}/channels/${channel.name}`));
        },
    );
});