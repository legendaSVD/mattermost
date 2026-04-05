import {Locator, expect} from '@playwright/test';
import {ConfirmModal} from '@/ui/components/system_console/base_modal';
export class SaveChangesModal extends ConfirmModal {
    readonly messageBody: Locator;
    readonly changesList: Locator;
    constructor(container: Locator) {
        super(container);
        this.messageBody = this.container.locator('#confirmModalBody');
        this.changesList = this.messageBody.locator('ul.changes-list');
    }
    async getChanges(): Promise<string[]> {
        const items = this.changesList.locator('li');
        const count = await items.count();
        const changes: string[] = [];
        for (let i = 0; i < count; i++) {
            changes.push(((await items.nth(i).textContent()) ?? '').trim());
        }
        return changes;
    }
}
export default class UserDetail {
    readonly container: Locator;
    readonly backLink: Locator;
    readonly header: Locator;
    readonly userCard: AdminUserCard;
    readonly teamMembershipPanel: TeamMembershipPanel;
    readonly saveChangesModal: SaveChangesModal;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly errorMessage: Locator;
    constructor(container: Locator) {
        this.container = container.locator('.SystemUserDetail');
        this.backLink = this.container.locator('.admin-console__header .back');
        this.header = this.container.getByText('User Configuration', {exact: true});
        this.userCard = new AdminUserCard(this.container.locator('.AdminUserCard'));
        this.teamMembershipPanel = new TeamMembershipPanel(
            this.container.locator('.AdminPanel').filter({hasText: 'Team Membership'}),
        );
        this.saveChangesModal = new SaveChangesModal(
            this.container.page().locator('#admin-userDetail-saveChangesModal'),
        );
        this.saveButton = this.container.getByTestId('saveSetting');
        this.cancelButton = this.container.getByRole('button', {name: 'Cancel'});
        this.errorMessage = this.container.locator('.error-message');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.header).toBeVisible();
    }
    async goBack() {
        await this.backLink.click();
    }
    async save() {
        await expect(this.saveButton).toBeEnabled();
        await this.saveButton.click();
    }
    async cancel() {
        await expect(this.cancelButton).toBeVisible();
        await this.cancelButton.click();
    }
    async waitForSaveComplete() {
        await expect(this.saveButton).toBeDisabled();
    }
}
class AdminUserCard {
    readonly container: Locator;
    readonly profileImage: Locator;
    readonly displayName: Locator;
    readonly nickname: Locator;
    readonly userId: Locator;
    readonly body: Locator;
    readonly twoColumnLayout: Locator;
    readonly fieldRows: Locator;
    readonly usernameInput: Locator;
    readonly emailInput: Locator;
    readonly authDataInput: Locator;
    readonly authenticationMethod: Locator;
    readonly resetPasswordButton: Locator;
    readonly deactivateButton: Locator;
    readonly manageUserSettingsButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        const header = container.locator('.AdminUserCard__header');
        this.profileImage = header.locator('.Avatar');
        this.displayName = header.locator('.AdminUserCard__user-info span').first();
        this.nickname = header.locator('.AdminUserCard__user-nickname');
        this.userId = header.locator('.AdminUserCard__user-id');
        this.body = container.locator('.AdminUserCard__body');
        this.twoColumnLayout = this.body.locator('.two-column-layout');
        this.fieldRows = this.body.locator('.field-row');
        this.usernameInput = this.getFieldInputByExactLabel('Username');
        this.emailInput = this.getFieldInputByExactLabel('Email');
        this.authDataInput = this.getFieldInputByExactLabel('Auth Data');
        this.authenticationMethod = this.getFieldColumn('Authentication Method').locator('label > span').last();
        const footer = container.locator('.AdminUserCard__footer');
        this.resetPasswordButton = footer.getByRole('button', {name: 'Reset Password'});
        this.deactivateButton = footer.getByRole('button', {name: 'Deactivate'});
        this.manageUserSettingsButton = footer.getByRole('button', {name: 'Manage User Settings'});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    private getFieldColumn(labelText: string): Locator {
        return this.body
            .locator('.field-column')
            .filter({has: this.body.page().locator(`span:text-is("${labelText}")`)});
    }
    getFieldInputByExactLabel(labelText: string): Locator {
        return this.getFieldColumn(labelText).locator('input');
    }
    getSelectByExactLabel(labelText: string): Locator {
        return this.getFieldColumn(labelText).locator('select');
    }
    getFieldError(labelText: string): Locator {
        return this.getFieldColumn(labelText).locator('.field-error');
    }
}
class TeamMembershipPanel {
    readonly container: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly addTeamButton: Locator;
    readonly teamRows: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.getByRole('heading', {name: 'Team Membership'});
        this.description = container.getByText('Teams to which this user belongs');
        this.addTeamButton = container.getByRole('button', {name: 'Add Team'});
        this.teamRows = container.locator('.TeamRow');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.title).toBeVisible();
    }
}