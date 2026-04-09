export enum Action {
    URL = 'url',
}
export type ProductNotice = {
    id: string;
    title: string;
    description: string;
    image?: string;
    actionText?: string;
    action?: Action;
    actionParam?: string;
    sysAdminOnly: boolean;
    teamAdminOnly: boolean;
}
export type ProductNotices = ProductNotice[];