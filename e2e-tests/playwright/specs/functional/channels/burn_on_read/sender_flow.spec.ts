import {expect, test} from '@mattermost/playwright-lib';
import {BOR_TAG, setupBorTest, createSecondUser} from './support';
test.describe('Burn-on-Read Sender Flow', () => {
    test('MM-66742_15 sends BoR message and views sent status with recipient count', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user, team, adminClient} = await setupBorTest(pw);
        await createSecondUser(pw, adminClient, team);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name, 'town-square');
        await channelsPage.toBeVisible();
        await channelsPage.centerView.postCreate.toggleBurnOnRead();
        await expect(channelsPage.centerView.postCreate.burnOnReadLabel).toBeVisible();
        const message = `BoR Test ${pw.random.id()}`;
        await channelsPage.postMessage(message);
        const lastPost = await channelsPage.getLastPost();
        await expect(lastPost.burnOnReadBadge.container).toBeVisible();
        await expect(lastPost.burnOnReadBadge.flameIcon).toBeVisible();
        await lastPost.burnOnReadBadge.hover();
        const tooltipText = await lastPost.burnOnReadBadge.getTooltipText();
        expect(tooltipText).toContain('Read by 0 of');
        expect(tooltipText).toContain('Click to delete');
    });
    test('MM-66742_16 sender sees read receipts in tooltip', {tag: [BOR_TAG]}, async ({pw}, testInfo) => {
        testInfo.setTimeout(120000);
        const {user, team, adminClient} = await setupBorTest(pw);
        const recipient1 = await createSecondUser(pw, adminClient, team);
        const recipient2 = await createSecondUser(pw, adminClient, team);
        const channelSuffix = Date.now().toString(36);
        const channel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: `bor-test-${channelSuffix}`,
                displayName: `BoR Test ${channelSuffix}`,
                type: 'P',
            }),
        );
        await adminClient.addToChannel(user.id, channel.id);
        await adminClient.addToChannel(recipient1.id, channel.id);
        await adminClient.addToChannel(recipient2.id, channel.id);
        const adminUser = await adminClient.getMe();
        await adminClient.removeFromChannel(adminUser.id, channel.id);
        const {channelsPage: senderPage} = await pw.testBrowser.login(user);
        await senderPage.goto(team.name, channel.name);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `Secret message ${pw.random.id()}`;
        await senderPage.postMessage(message);
        let senderPost = await senderPage.getLastPost();
        await senderPost.burnOnReadBadge.hover();
        let recipientCount = await senderPost.burnOnReadBadge.getRecipientCount();
        expect(recipientCount.revealed).toBe(0);
        expect(recipientCount.total).toBe(2);
        const {channelsPage: recipient1Page} = await pw.testBrowser.login(recipient1);
        await recipient1Page.goto(team.name, channel.name);
        await recipient1Page.toBeVisible();
        const recipient1Post = await recipient1Page.getLastPost();
        await recipient1Post.concealedPlaceholder.clickToReveal();
        await recipient1Post.concealedPlaceholder.waitForReveal();
        await senderPage.page.reload();
        await senderPage.toBeVisible();
        senderPost = await senderPage.getLastPost();
        await expect(senderPost.burnOnReadBadge.container).toBeVisible({timeout: 15000});
        await senderPost.burnOnReadBadge.hover();
        recipientCount = await senderPost.burnOnReadBadge.getRecipientCount();
        expect(recipientCount.revealed).toBe(1);
        const {channelsPage: recipient2Page} = await pw.testBrowser.login(recipient2);
        await recipient2Page.goto(team.name, channel.name);
        await recipient2Page.toBeVisible();
        const recipient2Post = await recipient2Page.getLastPost();
        await recipient2Post.concealedPlaceholder.clickToReveal();
        await recipient2Post.concealedPlaceholder.waitForReveal();
        await senderPage.page.reload();
        await senderPage.toBeVisible();
        senderPost = await senderPage.getLastPost();
        await expect(senderPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
    });
    test('MM-66742_17 sender manually deletes for all recipients', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user, team, adminClient} = await setupBorTest(pw);
        const recipient = await createSecondUser(pw, adminClient, team);
        const {channelsPage: senderPage} = await pw.testBrowser.login(user);
        await senderPage.goto(team.name, 'town-square');
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `To be deleted ${pw.random.id()}`;
        await senderPage.postMessage(message);
        const senderPost = await senderPage.getLastPost();
        const postId = await senderPost.getId();
        await senderPost.burnOnReadBadge.click();
        await expect(senderPage.burnOnReadConfirmationModal.container).toBeVisible();
        await senderPage.burnOnReadConfirmationModal.confirm();
        const deletedPostLocator = senderPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostLocator).not.toBeVisible();
        const {channelsPage: recipientPage} = await pw.testBrowser.login(recipient);
        await recipientPage.goto(team.name, 'town-square');
        const posts = await recipientPage.centerView.container.locator('.post').all();
        for (const post of posts) {
            const text = await post.textContent();
            expect(text).not.toContain(message);
        }
    });
    test('MM-66742_18 sender sees timer after all recipients reveal', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user, team, adminClient} = await setupBorTest(pw, {
            durationSeconds: 60,
        });
        const recipient = await createSecondUser(pw, adminClient, team);
        const channelSuffix = Date.now().toString(36);
        const channel = await adminClient.createChannel(
            pw.random.channel({
                teamId: team.id,
                name: `bor-timer-test-${channelSuffix}`,
                displayName: `BoR Timer Test ${channelSuffix}`,
                type: 'P',
            }),
        );
        await adminClient.addToChannel(user.id, channel.id);
        await adminClient.addToChannel(recipient.id, channel.id);
        const adminUser = await adminClient.getMe();
        await adminClient.removeFromChannel(adminUser.id, channel.id);
        const {channelsPage: senderPage} = await pw.testBrowser.login(user);
        await senderPage.goto(team.name, channel.name);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `Timer test ${pw.random.id()}`;
        await senderPage.postMessage(message);
        let senderPost = await senderPage.getLastPost();
        await expect(senderPost.burnOnReadBadge.container).toBeVisible();
        await expect(senderPost.burnOnReadTimerChip.container).not.toBeVisible();
        const initialCount = await senderPost.burnOnReadBadge.getRecipientCount();
        expect(initialCount.total).toBe(1);
        expect(initialCount.revealed).toBe(0);
        const {channelsPage: recipientPage} = await pw.testBrowser.login(recipient);
        await recipientPage.goto(team.name, channel.name);
        await recipientPage.toBeVisible();
        const recipientPost = await recipientPage.getLastPost();
        await recipientPost.concealedPlaceholder.clickToReveal();
        await recipientPost.concealedPlaceholder.waitForReveal();
        await expect(recipientPost.burnOnReadTimerChip.container).toBeVisible();
        await senderPage.page.reload();
        await senderPage.toBeVisible();
        senderPost = await senderPage.getLastPost();
        await expect(senderPost.burnOnReadTimerChip.container).toBeVisible();
        await expect(senderPost.burnOnReadBadge.container).not.toBeVisible();
        const timeRemaining = await senderPost.burnOnReadTimerChip.getTimeRemaining();
        expect(timeRemaining).toMatch(/\d+:\d+/);
    });
});