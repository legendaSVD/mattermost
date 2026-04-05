import {Locator, expect} from '@playwright/test';
export default class EditionAndLicense {
    readonly container: Locator;
    readonly header: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.header = container.getByText('Edition and License', {exact: true});
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
        await expect(this.header).toBeVisible();
    }
}