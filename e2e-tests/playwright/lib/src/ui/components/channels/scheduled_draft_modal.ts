import {Locator, expect} from '@playwright/test';
export default class ScheduledDraftModal {
    readonly container: Locator;
    readonly confirmButton;
    readonly dateInput;
    readonly timeLocator;
    readonly timeDropdownOptions;
    constructor(container: Locator) {
        this.container = container;
        this.confirmButton = container.locator('button.confirm');
        this.dateInput = container.locator('div.Input_wrapper');
        this.timeLocator = container.locator('div.dateTime__input');
        this.timeDropdownOptions = container.locator('ul.dropdown-menu .MenuItem');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    getDaySuffix(day: number): string {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1:
                return 'st';
            case 2:
                return 'nd';
            case 3:
                return 'rd';
            default:
                return 'th';
        }
    }
    dateLocator(day: number, month: string, dayOfWeek: string) {
        const daySuffix = this.getDaySuffix(day);
        return this.container.locator(`button[aria-label*='${day}${daySuffix} ${month} (${dayOfWeek})']`);
    }
    async selectDay(dayFromToday: number = 0) {
        await this.dateInput.click();
        const pacificDate = this.getPacificDate();
        const originDate = new Date(pacificDate.getTime());
        if (dayFromToday) {
            pacificDate.setDate(pacificDate.getDate() + dayFromToday);
        }
        const day = pacificDate.getDate();
        const month = pacificDate.toLocaleString('default', {month: 'long'});
        const dayOfWeek = pacificDate.toLocaleDateString('en-US', {weekday: 'long'});
        const dl = this.dateLocator(day, month, dayOfWeek);
        if (!(await dl.isVisible()) && pacificDate.getMonth() !== originDate.getMonth()) {
            this.container.locator('button[aria-label="Go to next month"]').click();
        }
        await dl.click();
    }
    async confirm() {
        await this.confirmButton.isVisible();
        await this.confirmButton.click();
    }
    async selectTime() {
        await this.timeLocator.click();
        const timeButton = this.timeDropdownOptions.nth(2);
        await expect(timeButton).toBeVisible();
        await timeButton.click();
    }
    getPacificDate(): Date {
        const currentDate = new Date();
        const utcTime = currentDate.getTime() + currentDate.getTimezoneOffset() * 60000;
        const pacificOffset = -7 * 60;
        const pacificTime = new Date(utcTime + pacificOffset * 60000);
        return pacificTime;
    }
}