import {Locator, expect} from '@playwright/test';
export default class MainHeader {
    readonly container: Locator;
    readonly logo;
    readonly backButton;
    constructor(container: Locator) {
        this.container = container;
        this.logo = container.locator('.header-logo-link');
        this.backButton = container.getByTestId('back_button');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}