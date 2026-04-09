export enum LogLevel {
    Error = 'ERROR',
    Warning = 'WARNING',
    Info = 'INFO',
    Debug = 'DEBUG',
}
export type ClientResponse<T> = {
    response: Response;
    headers: Map<string, string>;
    data: T;
};
export type Options = {
    headers?: { [x: string]: string };
    method?: string;
    url?: string;
    credentials?: 'omit' | 'same-origin' | 'include';
    body?: any;
    signal?: RequestInit['signal'];
    ignoreStatus?: boolean;
    duplex?: 'half';
};
export type OptsSignalExt = {signal?: AbortSignal};
export type StatusOK = {
    status: 'OK';
};
export const isStatusOK = (x: StatusOK | Record<string, unknown>): x is StatusOK => (x as StatusOK)?.status === 'OK';
export type FetchPaginatedThreadOptions = {
    fetchThreads?: boolean;
    collapsedThreads?: boolean;
    collapsedThreadsExtended?: boolean;
    updatesOnly?: boolean;
    direction?: 'up'|'down';
    fetchAll?: boolean;
    perPage?: number;
    fromCreateAt?: number;
    fromUpdateAt?: number;
    fromPost?: string;
}