import {expect, test} from '@mattermost/playwright-lib';
import {BOR_TAG, setupBorTest, createSecondUser} from './support';
test.describe('Burn-on-Read Receiver Flow', () => {
    test('MM-66742_9 receiver sees concealed placeholder and reveals message', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const secretMessage = `Secret message ${await pw.random.id()}`;
        await senderPage.postMessage(secretMessage);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        const borPost = await receiverPage.getLastPost();
        await expect(borPost.concealedPlaceholder.container).toBeVisible();
        await expect(borPost.body).not.toContainText(secretMessage);
        const placeholderText = await borPost.concealedPlaceholder.getText();
        expect(placeholderText).toContain('View message');
        await borPost.concealedPlaceholder.clickToReveal();
        await borPost.concealedPlaceholder.waitForReveal();
        await expect(borPost.body).toContainText(secretMessage);
        await expect(borPost.concealedPlaceholder.container).not.toBeVisible();
    });
    test('MM-66742_10 receiver manually burns revealed message via timer chip', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `To be burned ${await pw.random.id()}`;
        await senderPage.postMessage(message);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        const borPost = await receiverPage.getLastPost();
        const postId = await borPost.getId();
        await borPost.concealedPlaceholder.clickToReveal();
        await borPost.concealedPlaceholder.waitForReveal();
        await expect(borPost.body).toContainText(message);
        await expect(borPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
        await borPost.burnOnReadTimerChip.click();
        await expect(receiverPage.burnOnReadConfirmationModal.container).toBeVisible();
        await receiverPage.burnOnReadConfirmationModal.confirm();
        const deletedPostLocator = receiverPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostLocator).not.toBeVisible();
    });
    test(
        'MM-66742_11 receiver uses dont show again preference for burn confirmation',
        {tag: [BOR_TAG]},
        async ({pw}) => {
            const {user: sender, team, adminClient} = await setupBorTest(pw);
            const receiver = await createSecondUser(pw, adminClient, team);
            await adminClient.createDirectChannel([sender.id, receiver.id]);
            const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
            await senderPage.goto(team.name, `@${receiver.username}`);
            await senderPage.toBeVisible();
            await senderPage.centerView.postCreate.toggleBurnOnRead();
            const message = `Test message ${await pw.random.id()}`;
            await senderPage.postMessage(message);
            const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
            await receiverPage.goto(team.name, `@${sender.username}`);
            await receiverPage.toBeVisible();
            const borPost = await receiverPage.getLastPost();
            await borPost.concealedPlaceholder.clickToReveal();
            await borPost.concealedPlaceholder.waitForReveal();
            await expect(borPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
            await borPost.burnOnReadTimerChip.click();
            await expect(receiverPage.burnOnReadConfirmationModal.container).toBeVisible();
            await expect(receiverPage.burnOnReadConfirmationModal.dontShowAgainCheckbox).toBeVisible();
            await receiverPage.burnOnReadConfirmationModal.confirmWithDontShowAgain();
            await expect(borPost.container).not.toBeVisible({timeout: 10000});
        },
    );
    test('MM-66742_12 timer chip displays countdown after reveal', {tag: [BOR_TAG]}, async ({pw}) => {
        const {
            user: sender,
            team,
            adminClient,
        } = await setupBorTest(pw, {
            durationSeconds: 60,
        });
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `Timer test ${await pw.random.id()}`;
        await senderPage.postMessage(message);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        const borPost = await receiverPage.getLastPost();
        await borPost.concealedPlaceholder.clickToReveal();
        await borPost.concealedPlaceholder.waitForReveal();
        await expect(borPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
        const initialTime = await borPost.burnOnReadTimerChip.getTimeRemaining();
        expect(initialTime).toMatch(/^\d+:\d{2}$/);
        await receiverPage.page.waitForTimeout(2000);
        const updatedTime = await borPost.burnOnReadTimerChip.getTimeRemaining();
        expect(updatedTime).toMatch(/^\d+:\d{2}$/);
        const parseTime = (t: string) => {
            const [m, s] = t.split(':').map(Number);
            return m * 60 + s;
        };
        expect(parseTime(updatedTime)).toBeLessThan(parseTime(initialTime));
    });
    test('MM-66742_13 message auto-deletes after timer expires', {tag: [BOR_TAG]}, async ({pw}, testInfo) => {
        testInfo.setTimeout(120000);
        const {
            user: sender,
            team,
            adminClient,
        } = await setupBorTest(pw, {
            durationSeconds: 10,
            maxTTLSeconds: 300,
        });
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.toBeVisible();
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `Auto-delete test ${await pw.random.id()}`;
        await senderPage.postMessage(message);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name, `@${sender.username}`);
        await receiverPage.toBeVisible();
        const borPost = await receiverPage.getLastPost();
        const postId = await borPost.getId();
        await borPost.concealedPlaceholder.clickToReveal();
        await borPost.concealedPlaceholder.waitForReveal();
        await expect(borPost.body).toContainText(message);
        await expect(borPost.burnOnReadTimerChip.container).toBeVisible({timeout: 15000});
        await expect(async () => {
            const postLocator = receiverPage.page.locator(`[id="post_${postId}"]`);
            await expect(postLocator).not.toBeVisible();
        }).toPass({
            timeout: 20000,
            intervals: [1000],
        });
        const deletedPostLocator = receiverPage.page.locator(`[id="post_${postId}"]`);
        await expect(deletedPostLocator).not.toBeVisible();
        const pageContent = await receiverPage.centerView.container.textContent();
        expect(pageContent).not.toContain(message);
    });
    test('MM-66742_14 receiver sees flame badge on concealed message', {tag: [BOR_TAG]}, async ({pw}) => {
        const {user: sender, team, adminClient} = await setupBorTest(pw);
        const receiver = await createSecondUser(pw, adminClient, team);
        await adminClient.createDirectChannel([sender.id, receiver.id]);
        const {channelsPage: senderPage} = await pw.testBrowser.login(sender);
        await senderPage.goto(team.name);
        await senderPage.toBeVisible();
        await senderPage.goto(team.name, `@${receiver.username}`);
        await senderPage.centerView.postCreate.toggleBurnOnRead();
        const message = `Badge test ${await pw.random.id()}`;
        await senderPage.postMessage(message);
        const {channelsPage: receiverPage} = await pw.testBrowser.login(receiver);
        await receiverPage.goto(team.name);
        await receiverPage.toBeVisible();
        await receiverPage.goto(team.name, `@${sender.username}`);
        const borPost = await receiverPage.getLastPost();
        await expect(borPost.concealedPlaceholder.container).toBeVisible();
        await expect(borPost.burnOnReadBadge.container).toBeVisible();
        const ariaLabel = await borPost.burnOnReadBadge.getAriaLabel();
        expect(ariaLabel).toContain('Burn-on-read message');
    });
});