import {Locator, expect} from '@playwright/test';
export default class SystemConsoleSidebarHeader {
    readonly container: Locator;
    readonly headerInfo: Locator;
    readonly title: Locator;
    readonly userName: Locator;
    readonly menuButton: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.headerInfo = container.locator('.header__info');
        this.title = container.getByText('System Console');
        this.userName = container.getByText(/^@/);
        this.menuButton = container.getByRole('button', {name: 'Menu Icon'});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.title).toBeVisible();
    }
}