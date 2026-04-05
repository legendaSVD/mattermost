import {Locator, expect} from '@playwright/test';
export default class ChannelsAppBar {
    readonly container: Locator;
    readonly playbooksIcon;
    constructor(container: Locator) {
        this.container = container;
        this.playbooksIcon = container.locator('#app-bar-icon-playbooks').getByRole('img');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}