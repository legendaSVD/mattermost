import {Locator, expect} from '@playwright/test';
export default class ChannelsSidebarLeft {
    readonly container: Locator;
    readonly teamMenuButton: Locator;
    readonly browseOrCreateChannelButton: Locator;
    readonly findChannelButton;
    readonly scheduledPostBadge;
    readonly unreadChannelFilter;
    constructor(container: Locator) {
        this.container = container;
        this.teamMenuButton = container.locator('#sidebarTeamMenuButton');
        this.browseOrCreateChannelButton = container.locator('#browseOrAddChannelMenuButton');
        this.findChannelButton = container.getByRole('button', {name: 'Find Channels'});
        this.scheduledPostBadge = container.locator('span.scheduledPostBadge');
        this.unreadChannelFilter = container.locator('.SidebarFilters_filterButton');
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async goToItem(channelName: string) {
        const channel = this.container.locator(`#sidebarItem_${channelName}`);
        await channel.waitFor();
        await channel.click();
    }
    async draftsVisible() {
        const draftSidebarLink = this.container.getByText('Drafts', {exact: true});
        await draftSidebarLink.waitFor();
        await expect(draftSidebarLink).toBeVisible();
    }
    async draftsNotVisible() {
        const channel = this.container.getByText('Drafts', {exact: true});
        await expect(channel).not.toBeVisible();
    }
    async isUnreadsFilterActive(): Promise<boolean> {
        return await this.unreadChannelFilter.evaluate((el) => el.classList.contains('active'));
    }
    async toggleUnreadsFilter() {
        await this.unreadChannelFilter.click();
    }
    getUnreadChannels(): Locator {
        return this.container.locator('.SidebarLink.unread-title');
    }
}