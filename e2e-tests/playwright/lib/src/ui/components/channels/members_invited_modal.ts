import {Locator, expect} from '@playwright/test';
export default class MembersInvitedModal {
    readonly container: Locator;
    readonly doneButton: Locator;
    readonly inviteMoreButton: Locator;
    readonly sentSection: Locator;
    readonly notSentSection: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.doneButton = container.getByRole('button', {name: 'Done'});
        this.inviteMoreButton = container.getByRole('button', {name: 'Invite More People'});
        this.sentSection = container.locator('.invitation-modal-confirm--sent');
        this.notSentSection = container.locator('.invitation-modal-confirm--not-sent');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async close() {
        await this.doneButton.click();
    }
    async getSentResultReason(): Promise<string> {
        await expect(this.sentSection).toBeVisible();
        return (await this.sentSection.locator('.InviteResultRow .reason').textContent()) ?? '';
    }
    async getNotSentResultReason(): Promise<string> {
        await expect(this.notSentSection).toBeVisible();
        return (await this.notSentSection.locator('.InviteResultRow .reason').textContent()) ?? '';
    }
    async clickInviteMore() {
        await expect(this.inviteMoreButton).toBeVisible();
        await this.inviteMoreButton.click();
    }
}