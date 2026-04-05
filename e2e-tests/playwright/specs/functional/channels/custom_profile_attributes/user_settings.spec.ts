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
    verifyAttributesExistInSettings,
    verifyAttributeInPopover,
    verifyAttributeNotInPopover,
    editTextAttribute,
    editSelectAttribute,
    editMultiselectAttribute,
    getFieldIdByName,
    TEST_PHONE,
    TEST_UPDATED_PHONE,
    TEST_URL,
    TEST_UPDATED_URL,
    TEST_INVALID_URL,
    TEST_VALID_URL,
    TEST_DEPARTMENT,
    TEST_UPDATED_DEPARTMENT,
    TEST_CHANGED_VALUE,
    TEST_LOCATION_OPTIONS,
    TEST_SKILLS_OPTIONS,
    TEST_MESSAGE,
    TEST_MESSAGE_OTHER,
} from './helpers';
const customAttributes: CustomProfileAttribute[] = [
    {
        name: 'Department',
        value: TEST_DEPARTMENT,
        type: 'text',
    },
    {
        name: 'Location',
        type: 'select',
        options: TEST_LOCATION_OPTIONS,
    },
    {
        name: 'Skills',
        type: 'multiselect',
        options: TEST_SKILLS_OPTIONS,
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
test('MM-T5768 Editing Custom Profile Attributes @custom_profile_attributes', async ({pw}) => {
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    const profileModal = await channelsPage.openProfileModal();
    await profileModal.toBeVisible();
    await verifyAttributesExistInSettings(page, customAttributes);
    await editTextAttribute(page, attributeFieldsMap, 'Department', TEST_UPDATED_DEPARTMENT);
    await editSelectAttribute(page, attributeFieldsMap, 'Location', 0);
    await editMultiselectAttribute(page, attributeFieldsMap, 'Skills', [3, 2]);
    await profileModal.closeModal();
    await channelsPage.postMessage(TEST_MESSAGE);
    const {channelsPage: otherChannelsPage} = await pw.testBrowser.login(otherUser);
    await otherChannelsPage.goto();
    const lastPost = await otherChannelsPage.getLastPost();
    await otherChannelsPage.openProfilePopover(lastPost);
    await verifyAttributeInPopover(otherChannelsPage, 'Department', TEST_UPDATED_DEPARTMENT);
    await verifyAttributeInPopover(otherChannelsPage, 'Location', 'Remote');
    await verifyAttributeInPopover(otherChannelsPage, 'Skills', 'Python');
    await verifyAttributeInPopover(otherChannelsPage, 'Skills', 'Node.js');
});
test('MM-T5769 Clearing Custom Profile Attributes @custom_profile_attributes', async ({pw}) => {
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await adminClient.createPost({
        channel_id: testChannel.id,
        message: TEST_MESSAGE_OTHER,
        user_id: otherUser.id,
    });
    const profileModal = await channelsPage.openProfileModal();
    await profileModal.toBeVisible();
    await editTextAttribute(page, attributeFieldsMap, 'Department', '');
    await profileModal.closeModal();
    await channelsPage.postMessage('Testing cleared attributes');
    const {channelsPage: otherChannelsPage} = await pw.testBrowser.login(otherUser);
    await otherChannelsPage.goto();
    const lastPost = await channelsPage.getLastPost();
    await channelsPage.openProfilePopover(lastPost);
    await verifyAttributeNotInPopover(otherChannelsPage, 'Department');
});
test('MM-T5770 Cancelling Changes to Custom Profile Attributes @custom_profile_attributes', async ({pw}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    const profileModal = await channelsPage.openProfileModal();
    await profileModal.toBeVisible();
    const department = 'Department';
    const fieldId = getFieldIdByName(attributeFieldsMap, department);
    await profileModal.container.locator(`text=${department}`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).click();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).clear();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).fill(TEST_CHANGED_VALUE);
    await profileModal.cancelButton.click();
    await profileModal.container.locator(`text=Department`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).click();
    await expect(profileModal.container.locator(`#customAttribute_${fieldId}`)).toHaveValue(TEST_DEPARTMENT);
});
test('MM-T5771 Editing Phone and URL Type Custom Profile Attributes @custom_profile_attributes', async ({pw}) => {
    const {page, channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    await adminClient.createPost({
        channel_id: testChannel.id,
        message: TEST_MESSAGE_OTHER,
        user_id: otherUser.id,
    });
    const profileModal = await channelsPage.openProfileModal();
    await profileModal.toBeVisible();
    await editTextAttribute(page, attributeFieldsMap, 'Phone', TEST_UPDATED_PHONE);
    await editTextAttribute(page, attributeFieldsMap, 'Website', TEST_UPDATED_URL);
    await profileModal.closeModal();
    await channelsPage.postMessage('Testing phone and URL attributes');
    const {channelsPage: otherChannelsPage} = await pw.testBrowser.login(otherUser);
    await otherChannelsPage.goto();
    const lastPost = await otherChannelsPage.getLastPost();
    await otherChannelsPage.openProfilePopover(lastPost);
    await verifyAttributeInPopover(otherChannelsPage, 'Phone', TEST_UPDATED_PHONE);
    await verifyAttributeInPopover(otherChannelsPage, 'Website', TEST_UPDATED_URL);
});
test('MM-T5772 URL Validation in Custom Profile Attributes @custom_profile_attributes', async ({pw}) => {
    const {channelsPage} = await pw.testBrowser.login(user);
    await channelsPage.goto();
    const profileModal = await channelsPage.openProfileModal();
    await profileModal.toBeVisible();
    const fieldId = getFieldIdByName(attributeFieldsMap, 'Website');
    await profileModal.container.locator(`text=Website`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}Edit`).click();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).scrollIntoViewIfNeeded();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).clear();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).fill(TEST_INVALID_URL);
    await profileModal.container.locator(`#customAttribute_${fieldId}`).blur();
    await expect(profileModal.container.locator(`#error_customAttribute_${fieldId}`)).toBeVisible();
    await expect(profileModal.container.locator(`#error_customAttribute_${fieldId}`)).toHaveText(
        'Please enter a valid url.',
    );
    await profileModal.container.locator(`#customAttribute_${fieldId}`).clear();
    await profileModal.container.locator(`#customAttribute_${fieldId}`).fill(TEST_VALID_URL);
    await profileModal.saveButton.click();
    await expect(profileModal.container.locator(`#error_customAttribute_${fieldId}`)).not.toBeVisible();
    await expect(profileModal.container).toContainText(TEST_VALID_URL);
});