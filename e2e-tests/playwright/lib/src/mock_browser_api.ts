import {Page} from '@playwright/test';
type NotificationData = {title: string} & NotificationOptions;
declare global {
    interface Window {
        _originalNotification: typeof Notification;
        _notifications: NotificationData[];
        getNotifications: () => NotificationData[];
    }
}
export async function stubNotification(page: Page, permission: NotificationPermission) {
    await page.evaluate((notificationPermission: NotificationPermission) => {
        window.Notification.requestPermission = () => Promise.resolve(permission);
        if (!window._originalNotification) {
            window._originalNotification = window.Notification;
        }
        window._notifications = [];
        class CustomNotification extends window._originalNotification {
            constructor(title: string, options?: NotificationOptions) {
                super(title, options);
                const notification = {title, ...options};
                window._notifications.push(notification);
            }
        }
        Object.defineProperties(CustomNotification, {
            permission: {
                get: () => notificationPermission,
            },
            requestPermission: {
                value: () => Promise.resolve(notificationPermission),
            },
        });
        window.Notification = CustomNotification as unknown as typeof Notification;
        window.getNotifications = () => window._notifications;
    }, permission);
}
export async function waitForNotification(
    page: Page,
    expectedCount = 1,
    timeout: number = 5000,
): Promise<NotificationData[]> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const notifications = await page.evaluate(() => window.getNotifications());
        if (notifications.length >= expectedCount) {
            return notifications;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    console.error(`Notification not received within the timeout period of ${timeout}ms`);
    return [];
}