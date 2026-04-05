import {Locator, expect} from '@playwright/test';
import UserDetail from '../user_detail';
import {ColumnToggleMenu, DateRangeMenu, FilterMenu, FilterPopover} from './menus';
import {ManageRolesModal, ResetPasswordModal, UpdateEmailModal} from './modals';
import {UsersTable} from './users_table';
import {ConfirmModal} from '@/ui/components/system_console/base_modal';
export {ColumnToggleMenu, DateRangeMenu, FilterMenu, FilterPopover} from './menus';
export {ManageRolesModal, ResetPasswordModal, UpdateEmailModal} from './modals';
export {UserActionMenu} from './user_action_menu';
export {UserRow, UsersTable} from './users_table';
export default class Users {
    readonly container: Locator;
    private readonly page;
    readonly userDetail: UserDetail;
    readonly confirmModal: ConfirmModal;
    readonly manageRolesModal: ManageRolesModal;
    readonly resetPasswordModal: ResetPasswordModal;
    readonly updateEmailModal: UpdateEmailModal;
    readonly header: Locator;
    readonly revokeAllSessionsButton: Locator;
    readonly searchInput: Locator;
    readonly filtersButton: Locator;
    readonly columnToggleMenuButton: Locator;
    readonly dateRangeSelectorMenuButton: Locator;
    readonly exportButton: Locator;
    readonly loadingSpinner: Locator;
    readonly usersTable: UsersTable;
    readonly columnToggleMenu: ColumnToggleMenu;
    readonly filterPopover: FilterPopover;
    readonly roleFilterMenu: FilterMenu;
    readonly statusFilterMenu: FilterMenu;
    readonly dateRangeMenu: DateRangeMenu;
    readonly paginationInfo: Locator;
    readonly previousPageButton: Locator;
    readonly nextPageButton: Locator;
    readonly rowsPerPageSelector: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.page = container.page();
        this.userDetail = new UserDetail(container);
        this.confirmModal = new ConfirmModal(this.page.locator('#confirmModal'));
        this.manageRolesModal = new ManageRolesModal(this.page.locator('.manage-teams'));
        this.resetPasswordModal = new ResetPasswordModal(this.page.locator('#resetPasswordModal'));
        this.updateEmailModal = new UpdateEmailModal(this.page.locator('#resetEmailModal'));
        this.header = container.getByText('Mattermost Users', {exact: true});
        this.revokeAllSessionsButton = container.getByRole('button', {name: 'Revoke All Sessions'});
        this.searchInput = container.getByRole('textbox', {name: 'Search users'});
        this.filtersButton = container.getByRole('button', {name: /Filters/});
        this.columnToggleMenuButton = container.locator('#systemUsersColumnTogglerMenuButton');
        this.dateRangeSelectorMenuButton = container.locator('#systemUsersDateRangeSelectorMenuButton');
        this.exportButton = container.getByText('Export');
        this.loadingSpinner = container.getByText('Loading');
        this.usersTable = new UsersTable(container.locator('#systemUsersTable'));
        this.columnToggleMenu = new ColumnToggleMenu(this.page.locator('#systemUsersColumnTogglerMenu'));
        this.filterPopover = new FilterPopover(this.page.locator('#systemUsersFilterPopover'));
        this.roleFilterMenu = new FilterMenu(this.page.locator('.DropDown__menu'));
        this.statusFilterMenu = new FilterMenu(this.page.locator('.DropDown__menu'));
        this.dateRangeMenu = new DateRangeMenu(this.page.locator('#systemUsersDateRangeSelectorMenu'));
        const footer = container.locator('.adminConsoleListTabletOptionalFoot');
        this.paginationInfo = footer.locator('span').first();
        this.previousPageButton = footer.getByRole('button', {name: 'Go to previous page'});
        this.nextPageButton = footer.getByRole('button', {name: 'Go to next page'});
        this.rowsPerPageSelector = footer.locator('.adminConsoleListTablePageSize .react-select');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.header).toBeVisible();
    }
    async isLoadingComplete() {
        await expect(this.loadingSpinner).toHaveCount(0);
    }
    async searchUsers(searchTerm: string) {
        await this.searchInput.fill(searchTerm);
        await this.isLoadingComplete();
    }
    async clearSearch() {
        await this.searchInput.clear();
    }
    async getFilterCount(): Promise<number> {
        const buttonText = await this.filtersButton.textContent();
        const match = buttonText?.match(/Filters \((\d+)\)/);
        return match ? parseInt(match[1], 10) : 0;
    }
    async openColumnToggleMenu(): Promise<ColumnToggleMenu> {
        await expect(this.columnToggleMenuButton).toBeVisible();
        await this.columnToggleMenuButton.click();
        await this.columnToggleMenu.toBeVisible();
        return this.columnToggleMenu;
    }
    async openFilterPopover(): Promise<FilterPopover> {
        await expect(this.filtersButton).toBeVisible();
        await this.filtersButton.click();
        await this.filterPopover.toBeVisible();
        return this.filterPopover;
    }
    async openDateRangeSelectorMenu(): Promise<DateRangeMenu> {
        await expect(this.dateRangeSelectorMenuButton).toBeVisible();
        await this.dateRangeSelectorMenuButton.click();
        await this.dateRangeMenu.toBeVisible();
        return this.dateRangeMenu;
    }
    async clickExport() {
        await this.exportButton.click();
    }
    async clickRevokeAllSessions() {
        await this.revokeAllSessionsButton.click();
    }
    async goToNextPage() {
        await this.nextPageButton.click();
    }
    async goToPreviousPage() {
        await this.previousPageButton.click();
    }
    async getPaginationInfo(): Promise<string> {
        return (await this.paginationInfo.textContent()) ?? '';
    }
    async getTotalUserCount(): Promise<number> {
        const text = await this.getPaginationInfo();
        const match = text.match(/of (\d+) users/);
        return match ? parseInt(match[1], 10) : 0;
    }
}