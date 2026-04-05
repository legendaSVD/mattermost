import {Locator, expect} from '@playwright/test';
export default class AdvancedSettings {
    readonly container: Locator;
    readonly title;
    public id = '#advancedSettings';
    readonly expandedSection;
    public expandedSectionId = '.section-max';
    readonly ctrlEnterEditButton;
    readonly postFormattingEditButton;
    readonly joinLeaveEditButton;
    readonly scrollPositionEditButton;
    readonly syncDraftsEditButton;
    constructor(container: Locator) {
        this.container = container;
        this.title = container.getByRole('heading', {name: 'Advanced Settings', exact: true});
        this.expandedSection = container.locator(this.expandedSectionId);
        this.ctrlEnterEditButton = container.locator('#advancedCtrlSendEdit');
        this.postFormattingEditButton = container.locator('#formattingEdit');
        this.joinLeaveEditButton = container.locator('#joinLeaveEdit');
        this.scrollPositionEditButton = container.locator('#unread_scroll_positionEdit');
        this.syncDraftsEditButton = container.locator('#syncDraftsEdit');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
}