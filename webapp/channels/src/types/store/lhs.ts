import type {SidebarSize} from 'components/resizable_sidebar/constants';
export type LhsViewState = {
    isOpen: boolean;
    size: SidebarSize;
    currentStaticPageId: string;
}
export enum LhsItemType {
    None = 'none',
    Page = 'page',
    Channel = 'channel',
}
export enum LhsPage {
    Drafts = 'drafts',
    Recaps = 'recaps',
    Threads = 'threads',
}
export type StaticPage = {
    id: string;
    isVisible: boolean;
}