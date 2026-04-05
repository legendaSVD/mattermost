import {Client4} from '@mattermost/client';
import {ServerChannel} from '@mattermost/types/channels';
import {FileUploadResponse} from '@mattermost/types/files';
import {Team} from '@mattermost/types/teams';
import {UserProfile} from '@mattermost/types/users';
import {expect, test, getFileFromAsset, getBlobFromAsset} from '@mattermost/playwright-lib';
import {FileUploadResponseSchema} from './schema';
let userClient: Client4;
let user: UserProfile;
let team: Team;
let townSquareChannel: ServerChannel;
const filename = 'mattermost-icon_128x128.png';
const file = getFileFromAsset(filename);
const blob = getBlobFromAsset(filename);
test.beforeEach(async ({pw}) => {
    ({userClient, user, team} = await pw.initSetup());
    townSquareChannel = await userClient.getChannelByName(team.id, 'town-square');
});
test('should succeed with File', async ({pw}) => {
    const clientId = await pw.random.id();
    const formData = new FormData();
    formData.set('channel_id', townSquareChannel.id);
    formData.set('client_ids', clientId);
    formData.set('files', file, filename);
    const data = await userClient.uploadFile(formData);
    validateFileUploadResponse(data, clientId, user.id, townSquareChannel.id);
});
test('should succeed with Blob', async ({pw}) => {
    const clientId = await pw.random.id();
    const formData = new FormData();
    formData.set('channel_id', townSquareChannel.id);
    formData.set('client_ids', clientId);
    formData.set('files', blob, filename);
    const data = await userClient.uploadFile(formData);
    validateFileUploadResponse(data, clientId, user.id, townSquareChannel.id);
});
test('should succeed even with channel_id only', async () => {
    const formData = new FormData();
    formData.set('channel_id', townSquareChannel.id);
    const data = await userClient.uploadFile(formData);
    const validate = () => FileUploadResponseSchema.parse(data);
    expect(validate).not.toThrow();
    expect(data.client_ids).toMatchObject([]);
    expect(data.file_infos.length).toBe(0);
});
test('should fail on invalid channel ID', async ({pw}) => {
    const clientId = await pw.random.id();
    let formData = new FormData();
    formData.set('channel_id', 'invalid.channel.id');
    formData.set('client_ids', clientId);
    formData.set('files', file, filename);
    await expect(userClient.uploadFile(formData)).rejects.toThrowError(
        'Invalid or missing channel_id parameter in request URL.',
    );
    formData = new FormData();
    formData.set('client_ids', clientId);
    formData.set('files', file, filename);
    await expect(userClient.uploadFile(formData)).rejects.toThrowError(
        'Invalid or missing channel_id in request body.',
    );
});
test('should fail on missing files', async ({pw}) => {
    const clientId = await pw.random.id();
    const formData = new FormData();
    formData.set('channel_id', townSquareChannel.id);
    formData.set('client_ids', clientId);
    await expect(userClient.uploadFile(formData)).rejects.toThrowError(
        'Unable to upload file(s). Have 1 client_ids for 0 files.',
    );
});
test('should fail on incorrect order setting up FormData', async ({pw}) => {
    const clientId = await pw.random.id();
    const formData = new FormData();
    formData.set('channel_id', townSquareChannel.id);
    formData.set('files', file, filename);
    formData.set('client_ids', clientId);
    await expect(userClient.uploadFile(formData)).rejects.toThrowError(
        'Invalid or missing client_ids in request body.',
    );
});
function validateFileUploadResponse(data: FileUploadResponse, clientId: string, userId: string, channelId: string) {
    const validate = () => FileUploadResponseSchema.parse(data);
    expect(validate).not.toThrow();
    expect(data.client_ids).toMatchObject([clientId]);
    expect(data.file_infos.length).toBe(1);
    const fileInfo = data.file_infos[0];
    expect(fileInfo.user_id).toBe(userId);
    expect(fileInfo.channel_id).toBe(channelId);
    expect(fileInfo.delete_at).toBe(0);
    expect(fileInfo.extension).toBe('png');
    expect(fileInfo.mime_type).toBe('image/png');
    expect(fileInfo.archived).toBe(false);
}