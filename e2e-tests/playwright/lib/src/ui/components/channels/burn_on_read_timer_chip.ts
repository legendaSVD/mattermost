import {expect, Locator} from '@playwright/test';
export default class BurnOnReadTimerChip {
    readonly container: Locator;
    readonly flameIcon: Locator;
    readonly timerText: Locator;
    constructor(container: Locator) {
        this.container = container;
        this.flameIcon = container.locator('.BurnOnReadTimerChip__icon');
        this.timerText = container.locator('.BurnOnReadTimerChip__time');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async toBeHidden() {
        await expect(this.container).not.toBeVisible();
    }
    async click() {
        await this.container.click();
    }
    async hover() {
        await this.container.hover();
    }
    async getTimeRemaining(): Promise<string> {
        return (await this.timerText.textContent()) || '';
    }
    async getTimeRemainingInSeconds(): Promise<number> {
        const timeText = await this.getTimeRemaining();
        const parts = timeText.split(':');
        if (parts.length !== 2) {
            throw new Error(`Invalid timer format: ${timeText}`);
        }
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        return minutes * 60 + seconds;
    }
    async isWarning(): Promise<boolean> {
        const className = await this.container.getAttribute('class');
        return className?.includes('BurnOnReadTimerChip--warning') || false;
    }
    async isExpired(): Promise<boolean> {
        const className = await this.container.getAttribute('class');
        return className?.includes('BurnOnReadTimerChip--expired') || false;
    }
    async getTooltipText(): Promise<string> {
        await this.hover();
        const tooltip = this.container.page().locator('[role="tooltip"]').first();
        await tooltip.waitFor({state: 'visible', timeout: 2000});
        return (await tooltip.textContent()) || '';
    }
}