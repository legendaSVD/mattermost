import {Locator, expect} from '@playwright/test';
export default class SystemRoles {
    readonly container: Locator;
    readonly backLink: Locator;
    readonly roleName: Locator;
    readonly privilegesPanel: PrivilegesPanel;
    readonly assignedPeoplePanel: AssignedPeoplePanel;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly errorMessage: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.backLink = container.locator('.admin-console__header .back');
        this.roleName = container.locator('.admin-console__header span').last();
        this.privilegesPanel = new PrivilegesPanel(container.locator('#SystemRolePermissions'));
        this.assignedPeoplePanel = new AssignedPeoplePanel(container.locator('#SystemRoleUsers'));
        this.saveButton = container.getByTestId('saveSetting');
        this.cancelButton = container.getByRole('link', {name: 'Cancel'});
        this.errorMessage = container.locator('.error-message');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.roleName).toBeVisible();
    }
    async goBack() {
        await this.backLink.click();
    }
    async save() {
        await this.saveButton.click();
    }
    async cancel() {
        await this.cancelButton.click();
    }
    async getRoleName(): Promise<string> {
        return (await this.roleName.textContent()) ?? '';
    }
}
class PrivilegesPanel {
    readonly container: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly about: PermissionSection;
    readonly reporting: PermissionSection;
    readonly userManagement: PermissionSection;
    readonly environment: PermissionSection;
    readonly siteConfiguration: PermissionSection;
    readonly authentication: PermissionSection;
    readonly plugins: PermissionSection;
    readonly integrations: PermissionSection;
    readonly compliance: PermissionSection;
    readonly experimental: PermissionSection;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.getByRole('heading', {name: 'Privileges'});
        this.description = container.getByText('Level of access to the system console.');
        this.about = new PermissionSection(container, 'permission_section_about');
        this.reporting = new PermissionSection(container, 'permission_section_reporting');
        this.userManagement = new PermissionSection(container, 'permission_section_user_management');
        this.environment = new PermissionSection(container, 'permission_section_environment');
        this.siteConfiguration = new PermissionSection(container, 'permission_section_site');
        this.authentication = new PermissionSection(container, 'permission_section_authentication');
        this.plugins = new PermissionSection(container, 'permission_section_plugins');
        this.integrations = new PermissionSection(container, 'permission_section_integrations');
        this.compliance = new PermissionSection(container, 'permission_section_compliance');
        this.experimental = new PermissionSection(container, 'permission_section_experimental');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.title).toBeVisible();
    }
}
class PermissionSection {
    readonly container: Locator;
    readonly row: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly subsectionsToggle: Locator;
    readonly dropdownButton: Locator;
    readonly subsectionsContainer: Locator;
    private readonly panelContainer: Locator;
    private readonly testId: string;
    private readonly sectionName: string;
    constructor(panelContainer: Locator, testId: string) {
        this.panelContainer = panelContainer;
        this.testId = testId;
        this.sectionName = testId.replace('permission_section_', '');
        this.container = panelContainer.getByTestId(testId);
        this.row = panelContainer.locator(`.PermissionRow:has([data-testid="${testId}"])`);
        this.title = this.container.locator('.PermissionSectionText_title');
        this.description = this.container.locator('.PermissionSection_description');
        this.subsectionsToggle = this.container.locator('.PermissionSubsectionsToggle button');
        this.dropdownButton = panelContainer.page().locator(`#systemRolePermissionDropdown${this.sectionName}`);
        this.subsectionsContainer = this.row.locator('.PermissionSubsections');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getPermissionValue(): Promise<string> {
        return (await this.dropdownButton.locator('.PermissionSectionDropdownButton_text').textContent()) ?? '';
    }
    async setPermission(permission: 'Can edit' | 'Read only' | 'No access') {
        await expect(this.dropdownButton).toBeVisible();
        await this.dropdownButton.click();
        const menuWrapper = this.dropdownButton.locator('xpath=ancestor::div[contains(@class, "MenuWrapper")]');
        await expect(menuWrapper).toHaveClass(/MenuWrapper--open/);
        const menuItem = menuWrapper.locator('.Menu__content li').filter({hasText: permission});
        await expect(menuItem).toBeVisible();
        await menuItem.click();
        await expect(menuWrapper).not.toHaveClass(/MenuWrapper--open/);
    }
    async expandSubsections() {
        const hasToggle = await this.subsectionsToggle.isVisible();
        if (!hasToggle) {
            return;
        }
        const buttonText = await this.subsectionsToggle.textContent();
        if (buttonText?.includes('Show')) {
            await this.subsectionsToggle.click();
            await expect(this.subsectionsContainer).toBeVisible();
        }
    }
    async collapseSubsections() {
        const hasToggle = await this.subsectionsToggle.isVisible();
        if (!hasToggle) {
            return;
        }
        const buttonText = await this.subsectionsToggle.textContent();
        if (buttonText?.includes('Hide')) {
            await this.subsectionsToggle.click();
        }
    }
    async hasSubsections(): Promise<boolean> {
        return this.subsectionsToggle.isVisible();
    }
    getSubsection(subsectionName: string): PermissionSubsection {
        const subsectionTestId = `${this.testId}_${subsectionName}`;
        return new PermissionSubsection(this.panelContainer, subsectionTestId);
    }
    get siteStatistics() {
        return this.getSubsection('site_statistics');
    }
    get teamStatistics() {
        return this.getSubsection('team_statistics');
    }
    get serverLogs() {
        return this.getSubsection('server_logs');
    }
    get users() {
        return this.getSubsection('users');
    }
    get groups() {
        return this.getSubsection('groups');
    }
    get teams() {
        return this.getSubsection('teams');
    }
    get channels() {
        return this.getSubsection('channels');
    }
    get permissions() {
        return this.getSubsection('permissions');
    }
    get systemRoles() {
        return this.getSubsection('system_roles');
    }
}
class PermissionSubsection {
    readonly container: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly dropdownButton: Locator;
    private readonly sectionName: string;
    constructor(panelContainer: Locator, testId: string) {
        this.container = panelContainer.getByTestId(testId);
        this.title = this.container.locator('.PermissionSectionText_title');
        this.description = this.container.locator('.PermissionSection_description');
        this.sectionName = testId.replace('permission_section_', '');
        this.dropdownButton = panelContainer.page().locator(`#systemRolePermissionDropdown${this.sectionName}`);
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getPermissionValue(): Promise<string> {
        return (await this.dropdownButton.locator('.PermissionSectionDropdownButton_text').textContent()) ?? '';
    }
    async setPermission(permission: 'Can edit' | 'Read only' | 'No access') {
        await this.toBeVisible();
        await expect(this.dropdownButton).toBeVisible();
        await this.dropdownButton.click();
        const menuWrapper = this.dropdownButton.locator('xpath=ancestor::div[contains(@class, "MenuWrapper")]');
        await expect(menuWrapper).toHaveClass(/MenuWrapper--open/);
        const menuItem = menuWrapper.locator('.Menu__content li').filter({hasText: permission});
        await expect(menuItem).toBeVisible();
        await menuItem.click();
        await expect(menuWrapper).not.toHaveClass(/MenuWrapper--open/);
    }
}
class AssignedPeoplePanel {
    readonly container: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly addPeopleButton: Locator;
    readonly searchInput: Locator;
    readonly userRows: Locator;
    readonly paginationInfo: Locator;
    readonly previousPageButton: Locator;
    readonly nextPageButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.getByRole('heading', {name: 'Assigned People'});
        this.description = container.getByText('List of people assigned to this system role.');
        this.addPeopleButton = container.getByRole('button', {name: 'Add People'});
        this.searchInput = container.getByTestId('searchInput');
        this.userRows = container.locator('.DataGrid_rows .DataGrid_row');
        this.paginationInfo = container.locator('.DataGrid_footer span');
        this.previousPageButton = container.locator('.DataGrid_footer .prev');
        this.nextPageButton = container.locator('.DataGrid_footer .next');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.title).toBeVisible();
    }
    async clickAddPeople() {
        await this.addPeopleButton.click();
    }
    async searchUsers(searchTerm: string) {
        await this.searchInput.fill(searchTerm);
    }
    async clearSearch() {
        await this.searchInput.clear();
    }
    async getUserCount(): Promise<number> {
        return this.userRows.count();
    }
    getUserRowByIndex(index: number): AssignedUserRow {
        return new AssignedUserRow(this.userRows.nth(index));
    }
    getUserRowByUsername(username: string): AssignedUserRow {
        const row = this.userRows.filter({hasText: username});
        return new AssignedUserRow(row);
    }
}
class AssignedUserRow {
    readonly container: Locator;
    readonly avatar: Locator;
    readonly name: Locator;
    readonly email: Locator;
    readonly removeLink: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.avatar = container.locator('.Avatar');
        this.name = container.locator('.UserGrid_name span').first();
        this.email = container.locator('.ug-email');
        this.removeLink = container.getByRole('link', {name: 'Remove'});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async getName(): Promise<string> {
        return (await this.name.textContent()) ?? '';
    }
    async getEmail(): Promise<string> {
        return (await this.email.textContent()) ?? '';
    }
    async remove() {
        await this.removeLink.click();
    }
}