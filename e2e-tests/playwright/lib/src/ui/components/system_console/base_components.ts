import {Locator, expect} from '@playwright/test';
export class RadioSetting {
    readonly container: Locator;
    readonly trueOption: Locator;
    readonly falseOption: Locator;
    readonly helpText: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.trueOption = container.getByRole('radio', {name: 'True'});
        this.falseOption = container.getByRole('radio', {name: 'False'});
        this.helpText = container.locator('.help-text');
    }
    async selectTrue() {
        await this.trueOption.check();
    }
    async selectFalse() {
        await this.falseOption.check();
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async toBeTrue() {
        await expect(this.trueOption).toBeChecked();
    }
    async toBeFalse() {
        await expect(this.falseOption).toBeChecked();
    }
}
export class TextInputSetting {
    readonly container: Locator;
    readonly label: Locator;
    readonly input: Locator;
    readonly helpText: Locator;
    constructor(container: Locator, labelText: string) {
        this.container = container;
        this.label = container.getByText(labelText);
        this.input = container.getByRole('textbox');
        this.helpText = container.locator('.help-text');
    }
    async fill(value: string) {
        await this.input.fill(value);
    }
    async getValue(): Promise<string> {
        return (await this.input.inputValue()) ?? '';
    }
    async clear() {
        await this.input.clear();
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}
export class DropdownSetting {
    readonly container: Locator;
    readonly label: Locator;
    readonly dropdown: Locator;
    readonly helpText: Locator;
    constructor(container: Locator, labelText: string) {
        this.container = container;
        this.label = container.getByText(labelText);
        this.dropdown = container.getByRole('combobox');
        this.helpText = container.locator('.help-text');
    }
    async select(option: string) {
        await this.dropdown.selectOption(option);
    }
    async getSelectedValue(): Promise<string> {
        return (await this.dropdown.inputValue()) ?? '';
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}
export class AdminSectionPanel {
    readonly container: Locator;
    readonly title: Locator;
    readonly description: Locator;
    readonly body: Locator;
    constructor(container: Locator, titleText: string) {
        this.container = container;
        this.title = container.getByRole('heading', {name: titleText});
        this.description = container.locator('.AdminSectionPanel__description');
        this.body = container.locator('.AdminSectionPanel__body');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}