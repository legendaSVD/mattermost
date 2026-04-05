import {Locator, expect} from '@playwright/test';
import {UserActionMenu} from './user_action_menu';
export class UsersTable {
    readonly container: Locator;
    readonly headerRow: Locator;
    readonly bodyRows: Locator;
    readonly userDetailsHeader: Locator;
    readonly emailHeader: Locator;
    readonly memberSinceHeader: Locator;
    readonly lastLoginHeader: Locator;
    readonly lastActivityHeader: Locator;
    readonly lastPostHeader: Locator;
    readonly daysActiveHeader: Locator;
    readonly messagesPostedHeader: Locator;
    readonly channelCountHeader: Locator;
    readonly actionsHeader: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.headerRow = container.locator('thead tr');
        this.bodyRows = container.locator('tbody tr');
        this.userDetailsHeader = container.locator('#systemUsersTable-header-usernameColumn');
        this.emailHeader = container.locator('#systemUsersTable-header-emailColumn');
        this.memberSinceHeader = container.locator('#systemUsersTable-header-createAtColumn');
        this.lastLoginHeader = container.locator('#systemUsersTable-header-lastLoginColumn');
        this.lastActivityHeader = container.locator('#systemUsersTable-header-lastStatusAtColumn');
        this.lastPostHeader = container.locator('#systemUsersTable-header-lastPostDateColumn');
        this.daysActiveHeader = container.locator('#systemUsersTable-header-daysActiveColumn');
        this.messagesPostedHeader = container.locator('#systemUsersTable-header-totalPostsColumn');
        this.channelCountHeader = container.locator('#systemUsersTable-header-channelCountColumn');
        this.actionsHeader = container.locator('#systemUsersTable-header-actionsColumn');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    getRowByIndex(index: number): UserRow {
        return new UserRow(this.bodyRows.nth(index), index);
    }
    getColumnHeader(columnName: string): Locator {
        const headerMap: Record<string, Locator> = {
            'User details': this.userDetailsHeader,
            Email: this.emailHeader,
            'Member since': this.memberSinceHeader,
            'Last login': this.lastLoginHeader,
            'Last activity': this.lastActivityHeader,
            'Last post': this.lastPostHeader,
            'Days active': this.daysActiveHeader,
            'Messages posted': this.messagesPostedHeader,
            'Channel count': this.channelCountHeader,
            Actions: this.actionsHeader,
        };
        const header = headerMap[columnName];
        if (!header) {
            throw new Error(`Unknown column: ${columnName}`);
        }
        return header;
    }
    async clickSortOnColumn(columnName: string) {
        const header = this.getColumnHeader(columnName);
        await header.click();
    }
    async sortByColumn(columnName: string): Promise<'ascending' | 'descending' | 'none'> {
        const header = this.getColumnHeader(columnName);
        const currentSort = await header.getAttribute('aria-sort');
        await header.click();
        if (currentSort) {
            await expect(header).not.toHaveAttribute('aria-sort', currentSort);
        } else {
            await expect(header).toHaveAttribute('aria-sort');
        }
        await this.waitForLoadingComplete();
        const newSort = await header.getAttribute('aria-sort');
        return (newSort as 'ascending' | 'descending' | 'none') ?? 'none';
    }
    async waitForLoadingComplete() {
        const loadingSpinner = this.container.locator('.loading-screen, .LoadingSpinner');
        await loadingSpinner.waitFor({state: 'detached', timeout: 10000}).catch(() => {
        });
        await this.bodyRows.first().waitFor({state: 'visible'});
    }
}
export class UserRow {
    readonly container: Locator;
    readonly index: number;
    readonly userDetailsCell: Locator;
    readonly emailCell: Locator;
    readonly memberSinceCell: Locator;
    readonly lastLoginCell: Locator;
    readonly lastActivityCell: Locator;
    readonly lastPostCell: Locator;
    readonly daysActiveCell: Locator;
    readonly messagesPostedCell: Locator;
    readonly channelCountCell: Locator;
    readonly actionsCell: Locator;
    readonly profilePicture: Locator;
    readonly displayName: Locator;
    readonly userName: Locator;
    readonly actionMenuButton: Locator;
    private readonly actionMenu: UserActionMenu;
    constructor(container: Locator, index: number) {
        this.container = container;
        this.index = index;
        this.userDetailsCell = container.locator('.usernameColumn');
        this.emailCell = container.locator('.emailColumn');
        this.memberSinceCell = container.locator('.createAtColumn');
        this.lastLoginCell = container.locator('.lastLoginColumn');
        this.lastActivityCell = container.locator('.lastStatusAtColumn');
        this.lastPostCell = container.locator('.lastPostDateColumn');
        this.daysActiveCell = container.locator('.daysActiveColumn');
        this.messagesPostedCell = container.locator('.totalPostsColumn');
        this.channelCountCell = container.locator('.channelCountColumn');
        this.actionsCell = container.locator('.actionsColumn');
        this.profilePicture = this.userDetailsCell.locator('.profilePicture');
        this.displayName = this.userDetailsCell.locator('.displayName');
        this.userName = this.userDetailsCell.locator('.userName');
        this.actionMenuButton = this.actionsCell.getByRole('button');
        this.actionMenu = new UserActionMenu(container.page().locator(`#actionMenu-systemUsersTable-${index}`));
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async click() {
        await this.container.click();
    }
    async getEmail(): Promise<string> {
        return (await this.emailCell.textContent()) ?? '';
    }
    async openActionMenu(): Promise<UserActionMenu> {
        await this.actionMenuButton.click();
        await this.actionMenu.toBeVisible();
        return this.actionMenu;
    }
}