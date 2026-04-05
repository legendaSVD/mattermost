import {Locator, expect} from '@playwright/test';
export default class MessagePriority {
    readonly container: Locator;
    readonly priorityIcon: Locator;
    readonly priorityMenu: Locator;
    readonly standardPriorityOption: Locator;
    readonly priorityDialog: Locator;
    readonly dialogHeader: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.priorityIcon = container.locator('#messagePriority');
        this.priorityMenu = container.locator('[role="menu"]');
        this.priorityDialog = container.page().getByRole('menu');
        this.dialogHeader = container.page().locator('h4.modal-title');
        this.standardPriorityOption = this.priorityDialog.getByRole('menuitemradio', {name: 'Standard'});
    }
    async clickPriorityIcon() {
        await this.priorityIcon.waitFor({state: 'visible'});
        await this.priorityIcon.click();
    }
    async verifyPriorityIconVisible() {
        await this.priorityIcon.waitFor({state: 'visible'});
        await expect(this.priorityIcon).toBeVisible();
    }
    async verifyStandardPrioritySelected() {
        await expect(this.priorityMenu).toBeVisible();
        await expect(this.standardPriorityOption).toHaveAttribute('aria-checked', 'true');
    }
    async verifyPriorityMenuVisible() {
        await expect(this.priorityMenu).toBeVisible();
        await expect(this.priorityMenu.locator('text=Message Priority')).toBeVisible();
    }
    async closePriorityMenu() {
        await this.priorityMenu.press('Escape');
        await expect(this.priorityMenu).not.toBeVisible();
    }
    async verifyNoPriorityLabel(postText: string) {
        const post = this.container.locator(`text=${postText}`);
        await expect(post).toBeVisible();
        const priorityLabel = post.locator('[data-testid="post-priority-label"]');
        await expect(priorityLabel).toHaveCount(0);
    }
    async verifyPriorityDialog() {
        await expect(this.priorityDialog).toBeVisible();
        await expect(this.dialogHeader).toHaveText('Message priority');
    }
}