import {expect, test} from '@mattermost/playwright-lib';
import {BOR_TAG, setupBorTest, createSecondUser} from './support';
test.describe('Burn-on-Read in DMs and GMs', () => {
    test('MM-66742_1 BoR toggle is available in DM channel', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user, team, adminClient} = await setupBorTest(pw);
        const otherUser = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([user.id, otherUser.id]);
        const {channelsPage} = await pw.testBrowser.login(user);
        await channelsPage.goto(team.name);
        await channelsPage.toBeVisible();
        await channelsPage.goto(team.name, `@${otherUser.username}`);
        await expect(channelsPage.centerView.postCreate.burnOnReadButton).toBeVisible();
        await channelsPage.centerView.postCreate.toggleBurnOnRead();
        await expect(channelsPage.centerView.postCreate.burnOnReadLabel).toBeVisible();
    });
    test('MM-66742_2 complete BoR flow in DM between two users', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name);
        await senderPage.toBeVisible();
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const secretMessage = `DM secret ${await pw.random.id()}`;
        await senderPage.postMessage(secretMessage);
        const senderPost = await senderPage.getLastPost();
        await expect(senderPost.body).toContainText(secretMessage);
        await expect(senderPost.burnOnReadBadge.container).toBeVisible();
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name);
        await receiverPage.toBeVisible();
        await receiverPage.goto(team.name, `@${sender.username}`);
        const receiverPost = await receiverPage.getLastPost();
        await expect(receiverPost.concealedPlaceholder.container).toBeVisible();
        await expect(receiverPost.body).not.toContainText(secretMessage);
        await receiverPost.concealedPlaceholder.clickToReveal();
        await receiverPost.concealedPlaceholder.waitForReveal();
        await expect(receiverPost.body).toContainText(secretMessage);
        await expect(receiverPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
    });
    test(
        'MM-66742_3 BoR message in group message with multiple recipients',
        {tag: [BOR_TAG]},
        async ({pw}, testInfo) => {
            testInfo.setTimeout(120000);
            const {user: sender, team, adminClient} = await setupBorTest(pw);
            const recipient1 = await createSecondUser(pw, adminClient, team);
            const recipient2 = await createSecondUser(pw, adminClient, team);
            const channelSuffix = Date.now().toString(36);
            const channel = await adminClient.createChannel(
                pw.random.channel({
                    teamId: team.id,
                    name: `bor-gm-test-${channelSuffix}`,
                    displayName: `BoR GM Test ${channelSuffix}`,
                    type: 'P',
                }),
            );
            await adminClient.addToChannel(sender.id, channel.id);
            await adminClient.addToChannel(recipient1.id, channel.id);
            await adminClient.addToChannel(recipient2.id, channel.id);
            const adminUser = await adminClient.getMe();
            await adminClient.removeFromChannel(adminUser.id, channel.id);
            const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
            await senderPage.goto(team.name, channel.name);
            await senderPage.toBeVisible();
            await senderPage.centerView.postCreate.toggleBurnOnRead();
            const secretMessage = `GM secret ${await pw.random.id()}`;
            await senderPage.postMessage(secretMessage);
            const senderPost = await senderPage.getLastPost();
            await expect(senderPost.burnOnReadBadge.container).toBeVisible();
            const tooltipText = await senderPost.burnOnReadBadge.getTooltipText();
            expect(tooltipText).toContain('Read by 0 of 2');
            const {channelsPage: recipient1Page} = await pw.testBrowser.login(recipient1);
            await recipient1Page.goto(team.name, channel.name);
            await recipient1Page.toBeVisible();
            const recipient1Post = await recipient1Page.getLastPost();
            await recipient1Post.concealedPlaceholder.clickToReveal();
            await recipient1Post.concealedPlaceholder.waitForReveal();
            await expect(recipient1Post.body).toContainText(secretMessage);
            await expect(recipient1Post.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
            await senderPage.page.reload();
            await senderPage.toBeVisible();
            const updatedSenderPost = await senderPage.getLastPost();
            await updatedSenderPost.burnOnReadBadge.hover();
            const updatedTooltip = await updatedSenderPost.burnOnReadBadge.getTooltipText();
            expect(updatedTooltip).toContain('Read by 1 of 2');
            const {channelsPage: recipient2Page} = await pw.testBrowser.login(recipient2);
            await recipient2Page.goto(team.name, channel.name);
            await recipient2Page.toBeVisible();
            const recipient2Post = await recipient2Page.getLastPost();
            await recipient2Post.concealedPlaceholder.clickToReveal();
            await recipient2Post.concealedPlaceholder.waitForReveal();
            await expect(recipient2Post.body).toContainText(secretMessage);
            await expect(recipient2Post.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
        },
    );
    test('MM-66742_4 sender deletes BoR in DM and recipient cannot see it', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name);
        await senderPage.toBeVisible();
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const secretMessage = `To be deleted ${await pw.random.id()}`;
        await senderPage.postMessage(secretMessage);
        const senderPost = await senderPage.getLastPost();
        const postId = await senderPost.getId();
        await senderPost.burnOnReadBadge.click();
        await expect(senderPage.burnOnReadConfirmationModal.container).toBeVisible();
        await senderPage.burnOnReadConfirmationModal.confirm();
        const deletedPostSender = senderPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostSender).not.toBeVisible();
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name);
        await receiverPage.toBeVisible();
        await receiverPage.goto(team.name, `@${sender.username}`);
        const deletedPostReceiver = receiverPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostReceiver).not.toBeVisible();
        const channelContent = await receiverPage.centerView.container.textContent();
        expect(channelContent).not.toContain(secretMessage);
    });
    test('MM-66742_5 receiver burns revealed BoR in DM via timer chip', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const secretMessage = `Receiver will burn ${await pw.random.id()}`;
        await senderPage.postMessage(secretMessage);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        const receiverPost = await receiverPage.getLastPost();
        const postId = await receiverPost.getId();
        await receiverPost.concealedPlaceholder.clickToReveal();
        await receiverPost.concealedPlaceholder.waitForReveal();
        await expect(receiverPost.body).toContainText(secretMessage);
        await expect(receiverPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
        await receiverPost.burnOnReadTimerChip.click();
        await expect(receiverPage.burnOnReadConfirmationModal.container).toBeVisible();
        await receiverPage.burnOnReadConfirmationModal.confirm();
        const deletedPostReceiver = receiverPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostReceiver).not.toBeVisible({timeout: 15000});
        await expect(receiverPage.centerView.container).not.toContainText(secretMessage);
    });
    test('MM-66742_6 DM shows correct recipient count of 1', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name);
        await senderPage.toBeVisible();
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const secretMessage = `Count test ${await pw.random.id()}`;
        await senderPage.postMessage(secretMessage);
        const senderPost = await senderPage.getLastPost();
        await senderPost.burnOnReadBadge.hover();
        const recipientCount = await senderPost.burnOnReadBadge.getRecipientCount();
        expect(recipientCount.total).toBe(1);
        expect(recipientCount.revealed).toBe(0);
    });
    test('MM-66742_7 multiple BoR messages in same DM conversation', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message1 = `First BoR ${await pw.random.id()}`;
        await senderPage.postMessage(message1);
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message2 = `Second BoR ${await pw.random.id()}`;
        await senderPage.postMessage(message2);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        await expect(receiverPage.centerView.container.locator('.BurnOnReadConcealedPlaceholder').first()).toBeVisible({
            timeout: 10000,
        });
        const concealedPlaceholders = receiverPage.centerView.container.locator('.BurnOnReadConcealedPlaceholder');
        const count = await concealedPlaceholders.count();
        expect(count).toBeGreaterThanOrEqual(1);
        for (let i = 0; i < count; i++) {
            const placeholder = concealedPlaceholders.nth(i);
            if (await placeholder.isVisible()) {
                await placeholder.click();
                await receiverPage.page.waitForTimeout(500);
            }
        }
        const pageContent = await receiverPage.centerView.container.textContent();
        const hasMessage1 = pageContent?.includes(message1);
        const hasMessage2 = pageContent?.includes(message2);
        expect(hasMessage1 || hasMessage2).toBe(true);
    });
    test('MM-66742_8 BoR toggle resets after sending message', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const isEnabledBefore = await senderPage.centerView.postCreate.isBurnOnReadEnabled();
        expect(isEnabledBefore).toBe(true);
        const message1 = `BoR message ${await pw.random.id()}`;
        await senderPage.postMessage(message1);
        const isEnabledAfter = await senderPage.centerView.postCreate.isBurnOnReadEnabled();
        expect(isEnabledAfter).toBe(false);
        const lastPost = await senderPage.getLastPost();
        await expect(lastPost.burnOnReadBadge.container).toBeVisible();
    });
});