import axios, {AxiosError} from 'axios';
import * as timeouts from '../fixtures/timeouts';
export interface ExternalRequestUser{
    username: string;
    password: string;
}
interface ExternalRequestArg {
    baseUrl: string;
    user: ExternalRequestUser;
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    path: string;
    data: any;
}
type ExternalRequestResult = { status: number; statusText: string; data: any; isError?: boolean } | { data: { id: string; isTimeout: boolean }; status?: undefined; statusText?: undefined; isError?: undefined };
export default async function externalRequest(arg: ExternalRequestArg): Promise<ExternalRequestResult> {
    const {baseUrl, user, method = 'get', path, data = {}} = arg;
    const loginUrl = `${baseUrl}/api/v4/users/login`;
    let cookieString = '';
    try {
        const response = await axios({
            url: loginUrl,
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            method: 'post',
            timeout: timeouts.TEN_SEC,
            data: {login_id: user.username, password: user.password},
        });
        const setCookie = response.headers['set-cookie'];
        (setCookie as any).forEach((cookie: string) => {
            const nameAndValue = cookie.split(';')[0];
            cookieString += nameAndValue + ';';
        });
    } catch (error) {
        return getErrorResponse(error);
    }
    try {
        const response = await axios({
            method,
            url: `${baseUrl}/api/v4/${path}`,
            headers: {
                'Content-Type': 'text/plain',
                Cookie: cookieString,
                'X-Requested-With': 'XMLHttpRequest',
            },
            timeout: timeouts.TEN_SEC,
            data,
        });
        return {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
        };
    } catch (error) {
        return getErrorResponse(error);
    }
}
function getErrorResponse(error: AxiosError) {
    if (error.response) {
        return {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            isError: true,
        };
    } else if (error.code === 'ECONNABORTED') {
        return {data: {id: error.code, isTimeout: true}};
    }
    throw error;
}