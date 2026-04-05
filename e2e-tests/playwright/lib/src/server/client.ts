import {Client4} from '@mattermost/client';
import {UserProfile} from '@mattermost/types/users';
import {testConfig} from '@/test_config';
const clients: Record<string, ClientCache> = {};
export async function makeClient(
    userRequest?: UserRequest,
    opts: {useCache?: boolean; skipLog?: boolean} = {useCache: true, skipLog: false},
): Promise<ClientCache> {
    const client = new Client4();
    client.setUrl(testConfig.baseURL);
    try {
        if (!userRequest) {
            return {client, user: null};
        }
        const cacheKey = userRequest.username + userRequest.password;
        if (opts?.useCache && clients[cacheKey] != null) {
            return clients[cacheKey];
        }
        const userProfile = await client.login(userRequest.username, userRequest.password);
        const user = {...userProfile, password: userRequest.password};
        if (opts?.useCache) {
            clients[cacheKey] = {client, user};
        }
        return {client, user};
    } catch (err) {
        if (!opts?.skipLog) {
            console.log('makeClient', err);
        }
        return {client, user: null};
    }
}
type UserRequest = {
    username: string;
    email?: string;
    password: string;
};
type ClientCache = {
    client: Client4;
    user: UserProfile | null;
};