import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {Channel} from '@mattermost/types/channels';
import {Client4} from '@mattermost/client';
import {UserPropertyField} from '@mattermost/types/properties';
import {expect, test} from '@mattermost/playwright-lib';
import {
    CustomProfileAttribute,
    setupCustomProfileAttributeFields,
    setupCustomProfileAttributeValues,
    deleteCustomProfileAttributes,
    verifyAttributeInPopover,
    verifyAttributeNotInPopover,
    updateCustomProfileAttributeVisibility,
    TEST_PHONE,
    TEST_URL,
    TEST_DEPARTMENT,
    TEST_LOCATION,
    TEST_UPDATED_DEPARTMENT,
    TEST_UPDATED_LOCATION,
    TEST_TITLE,
    TEST_MESSAGE,
} from './helpers';
const customAttributes: CustomProfileAttribute[] = [
    {
        name: 'Department',
        value: TEST_DEPARTMENT,
        type: 'text',
    },
    {
        name: 'Location',
        value: TEST_LOCATION,
        type: 'text',
    },
    {
        name: 'Title',
        value: TEST_TITLE,
        type: 'text',
    },
    {
        name: 'Phone',
        value: TEST_PHONE,
        type: 'text',
        attrs: {
            value_type: 'phone',
        },
    },
    {
        name: 'Website',
        value: TEST_URL,
        type: 'text',
        attrs: {
            value_type: 'url',
        },
    },
];
let team: Team;
let user: UserProfile;
let otherUser: UserProfile;
let testChannel: Channel;
let attributeFieldsMap: Record<string, UserPropertyField>;
let adminClient: Client4;
let userClient: Client4;
test.beforeEach(async ({pw}) => {
    await pw.ensureLicense();
    await pw.skipIfNoLicense();
    ({team, user, adminClient, userClient} = await pw.initSetup({userOptions: {prefix: 'cpa-test-'}}));
    const channel = pw.random.channel({
        teamId: team.id,
        name: `test-channel`,
        displayName: `Test Channel`,
    });
    testChannel = await adminClient.createChannel(channel);
    otherUser = await pw.createNewUserProfile(adminClient, {prefix: 'cpa-other-'});
    await adminClient.addToTeam(team.id, otherUser.id);
    await adminClient.addToChannel(otherUser.id, testChannel.id);
    await adminClient.addToChannel(user.id, testChannel.id);
    attributeFieldsMap = await setupCustomProfileAttributeFields(adminClient, customAttributes);
    const {page} = await pw.testBrowser.login(user);
    await setupCustomProfileAttributeValues(userClient, customAttributes, attributeFieldsMap);
    await page.goto(`/${team.name}/channels/${testChannel.name}`);
});
test.afterAll(async () => {
    await deleteCustomProfileAttributes(adminClient, attributeFieldsMap);
});
test('MM-T5773 Display custom profile attributes in profile popover @custom_profile_attributes', async ({pw}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    for (const attribute of customAttributes) {
        if (attribute.value) {
            await verifyAttributeInPopover(channelsPage, attribute.name, attribute.value);
        }
    }
});
test('MM-T5774 Do not display custom profile attributes if none exist @custom_profile_attributes', async ({pw}) => {
    const {channelsPage} = await pw.testBrowser.login(otherUser);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    for (const attribute of customAttributes) {
        await verifyAttributeNotInPopover(channelsPage, attribute.name);
    }
});
test('MM-T5775 Update custom profile attributes when changed @custom_profile_attributes', async ({pw}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    for (const attribute of customAttributes) {
        if (attribute.value) {
            await verifyAttributeInPopover(channelsPage, attribute.name, attribute.value);
        }
    }
    await channelsPage.page.click('body', {position: {x: 10, y: 10}});
    const updatedAttributes: CustomProfileAttribute[] = [
        {
            name: 'Department',
            value: TEST_UPDATED_DEPARTMENT,
            type: 'text',
        },
        {
            name: 'Location',
            value: TEST_UPDATED_LOCATION,
            type: 'text',
        },
    ];
    await setupCustomProfileAttributeValues(userClient, updatedAttributes, attributeFieldsMap);
    await channelsPage.openProfilePopover(lastPost);
    for (const attribute of updatedAttributes) {
        if (attribute.value) {
            await verifyAttributeInPopover(channelsPage, attribute.name, attribute.value);
        }
    }
    await verifyAttributeInPopover(channelsPage, 'Title', TEST_TITLE);
});
test('MM-T5776 Hide custom profile attributes when visibility is set to hidden @custom_profile_attributes', async ({
    pw,
}) => {
    await updateCustomProfileAttributeVisibility(adminClient, attributeFieldsMap, 'Department', 'hidden');
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    await verifyAttributeNotInPopover(channelsPage, 'Department');
    await verifyAttributeInPopover(channelsPage, 'Location', TEST_LOCATION);
});
test('MM-T5777 Always display custom profile attributes with visibility set to always @custom_profile_attributes', async ({
    pw,
}) => {
    await updateCustomProfileAttributeVisibility(adminClient, attributeFieldsMap, 'Title', 'always');
    const {channelsPage} = await pw.testBrowser.login(otherUser);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    for (const attribute of customAttributes) {
        if (attribute.name === 'Title') {
            const popover = channelsPage.userProfilePopover.container;
            const nameElement = popover.getByText('Title', {exact: false});
            await expect(nameElement).toBeVisible();
        } else {
            await verifyAttributeNotInPopover(channelsPage, attribute.name);
        }
    }
});
test('MM-T5778 Display phone and URL type custom profile attributes correctly @custom_profile_attributes', async ({
    pw,
}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    await verifyAttributeInPopover(channelsPage, 'Phone', TEST_PHONE);
    await verifyAttributeInPopover(channelsPage, 'Website', TEST_URL);
});
test('MM-T5779 Verify phone and URL attributes are clickable in profile popover @custom_profile_attributes', async ({
    pw,
}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await channelsPage.postMessage(TEST_MESSAGE);
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    const popover = channelsPage.userProfilePopover.container;
    const phoneLink = popover.getByText(TEST_PHONE, {exact: false});
    await expect(phoneLink).toHaveAttribute('href', new RegExp(`^tel:`));
    const urlLink = popover.getByText(TEST_URL, {exact: false});
    await expect(urlLink).toHaveAttribute('href', new RegExp(`^https:`));
});