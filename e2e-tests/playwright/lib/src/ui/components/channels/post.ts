import {Locator, expect} from '@playwright/test';
import BurnOnReadBadge from './burn_on_read_badge';
import BurnOnReadConcealedPlaceholder from './burn_on_read_concealed_placeholder';
import BurnOnReadTimerChip from './burn_on_read_timer_chip';
import PostMenu from './post_menu';
import ThreadFooter from './thread_footer';
export default class ChannelsPost {
    readonly container: Locator;
    readonly body;
    readonly profileIcon;
    readonly removePostButton;
    readonly postMenu;
    readonly threadFooter;
    readonly burnOnReadBadge;
    readonly burnOnReadTimerChip;
    readonly concealedPlaceholder;
    constructor(container: Locator) {
        this.container = container;
        this.body = container.locator('.post__body');
        this.profileIcon = container.locator('.profile-icon');
        this.removePostButton = container.locator('.post__remove');
        this.postMenu = new PostMenu(container.locator('.post-menu'));
        this.threadFooter = new ThreadFooter(container.locator('.ThreadFooter'));
        this.burnOnReadBadge = new BurnOnReadBadge(container.locator('.BurnOnReadBadge'));
        this.burnOnReadTimerChip = new BurnOnReadTimerChip(container.locator('.BurnOnReadTimerChip'));
        this.concealedPlaceholder = new BurnOnReadConcealedPlaceholder(
            container.locator('.BurnOnReadConcealedPlaceholder'),
        );
    }
    async toBeVisible() {
        await expect(this.container).toBeVisible();
    }
    async hover() {
        await this.container.hover();
    }
    async getId() {
        const id = await this.container.getAttribute('id');
        expect(id, 'No post ID found.').toBeTruthy();
        const postIdWithPossibleTimestamp = (id || '').substring('post_'.length);
        return postIdWithPossibleTimestamp.split(':')[0];
    }
    async getProfileImage(username: string) {
        return this.profileIcon.getByAltText(`${username} profile image`);
    }
    async openAThread() {
        await this.container.hover();
        await this.postMenu.toBeVisible();
        await this.postMenu.replyButton.waitFor();
        await this.postMenu.replyButton.click();
    }
    async reply() {
        await this.container.hover();
        await this.postMenu.toBeVisible();
        await this.postMenu.reply();
    }
    async remove() {
        await expect(this.container).toContainText(/\(message deleted\)/);
        await this.container.hover();
        await this.removePostButton.waitFor();
        await this.removePostButton.click();
    }
    async toContainText(text: string) {
        await expect(this.container).toContainText(text);
    }
    async toNotContainText(text: string) {
        await expect(this.container).not.toContainText(text);
    }
    async isBurnOnReadPost(): Promise<boolean> {
        const hasBadge = await this.burnOnReadBadge.container.isVisible();
        const hasTimer = await this.burnOnReadTimerChip.container.isVisible();
        return hasBadge || hasTimer;
    }
    async isConcealed(): Promise<boolean> {
        return await this.concealedPlaceholder.container.isVisible();
    }
    async isRevealed(): Promise<boolean> {
        return !(await this.isConcealed());
    }
}