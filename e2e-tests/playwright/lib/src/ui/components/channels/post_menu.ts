import {Locator, expect} from '@playwright/test';
export default class PostMenu {
    readonly container: Locator;
    readonly plusOneEmojiButton;
    readonly grinningEmojiButton;
    readonly whiteCheckMarkEmojiButton;
    readonly addReactionButton;
    readonly saveButton;
    readonly replyButton;
    readonly actionsButton;
    readonly dotMenuButton;
    constructor(container: Locator) {
        this.container = container;
        this.plusOneEmojiButton = container.getByRole('button', {name: '+1 emoji'});
        this.grinningEmojiButton = container.getByRole('button', {name: 'grinning emoji'});
        this.whiteCheckMarkEmojiButton = container.getByRole('button', {name: 'white check mark emoji'});
        this.addReactionButton = container.getByRole('button', {name: 'add reaction'});
        this.saveButton = container.getByRole('button', {name: 'save'});
        this.actionsButton = container.getByRole('button', {name: 'actions'});
        this.replyButton = container.getByRole('button', {name: 'reply'});
        this.dotMenuButton = container.getByRole('button', {name: 'more'});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async reply() {
        await this.replyButton.waitFor();
        await this.replyButton.click();
    }
    async openDotMenu() {
        await this.dotMenuButton.waitFor();
        await this.dotMenuButton.click();
    }
    async clickOnDotMenu() {
        await this.dotMenuButton.click();
    }
}