import {Locator, expect} from '@playwright/test';
export default class FindChannelsModal {
    readonly container: Locator;
    readonly input;
    readonly searchList;
    constructor(container: Locator) {
        this.container = container;
        this.input = container.getByRole('combobox', {name: 'quick switch input'});
        this.searchList = container.locator('.suggestion-list__item');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    getResult(channelName: string) {
        return this.container.getByTestId(channelName);
    }
    async selectChannel(channelName: string) {
        await this.getResult(channelName).click();
    }
}