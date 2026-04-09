const userAgent = () => window.navigator.userAgent;
export function isChrome(): boolean {
    return userAgent().indexOf('Chrome') > -1 && userAgent().indexOf('Edge') === -1;
}
export function isSafari(): boolean {
    return userAgent().indexOf('Safari') !== -1 && userAgent().indexOf('Chrome') === -1;
}
export function isIosSafari(): boolean {
    return (userAgent().indexOf('iPhone') !== -1 || userAgent().indexOf('iPad') !== -1) && userAgent().indexOf('Safari') !== -1 && userAgent().indexOf('CriOS') === -1;
}
export function isIosChrome(): boolean {
    return userAgent().indexOf('CriOS') !== -1;
}
export function isIosFirefox(): boolean {
    return userAgent().indexOf('FxiOS') !== -1;
}
export function isIosWeb(): boolean {
    return isIosSafari() || isIosChrome();
}
export function isIos(): boolean {
    return userAgent().indexOf('iPhone') !== -1 || userAgent().indexOf('iPad') !== -1;
}
export function isAndroid(): boolean {
    return userAgent().indexOf('Android') !== -1;
}
export function isAndroidChrome(): boolean {
    return userAgent().indexOf('Android') !== -1 && userAgent().indexOf('Chrome') !== -1 && userAgent().indexOf('Version') === -1;
}
export function isAndroidFirefox(): boolean {
    return userAgent().indexOf('Android') !== -1 && userAgent().indexOf('Firefox') !== -1;
}
export function isAndroidWeb(): boolean {
    return isAndroidChrome() || isAndroidFirefox();
}
export function isIosClassic(): boolean {
    return isMobileApp() && isIos();
}
export function isMobileApp(): boolean {
    return isMobile() && !isIosWeb() && !isAndroidWeb();
}
export function isMobile(): boolean {
    return isIos() || isAndroid();
}
export function isFirefox(): boolean {
    return userAgent().indexOf('Firefox') !== -1;
}
export function isChromebook(): boolean {
    return userAgent().indexOf('CrOS') !== -1;
}
export function isInternetExplorer(): boolean {
    return userAgent().indexOf('Trident') !== -1;
}
export function isEdge(): boolean {
    return userAgent().indexOf('Edge') !== -1;
}
export function isChromiumEdge(): boolean {
    return userAgent().indexOf('Edg') !== -1 && userAgent().indexOf('Edge') === -1;
}
export function isDesktopApp(): boolean {
    return userAgent().indexOf('Mattermost') !== -1 && userAgent().indexOf('Electron') !== -1;
}
export function isWindowsApp(): boolean {
    return isDesktopApp() && isWindows();
}
export function isMacApp(): boolean {
    return isDesktopApp() && isMac();
}
export function isWindows(): boolean {
    return userAgent().indexOf('Windows') !== -1;
}
export function isMac(): boolean {
    return userAgent().indexOf('Macintosh') !== -1;
}
export function isLinux(): boolean {
    return navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
}
export function isWindows7(): boolean {
    const appVersion = navigator.appVersion;
    if (!appVersion) {
        return false;
    }
    return (/\bWindows NT 6\.1\b/).test(appVersion);
}
export function getDesktopVersion(): string {
    const regex = /Mattermost\/(\d+\.\d+\.\d+)/gm;
    const match = regex.exec(window.navigator.appVersion)?.[1] || '';
    return match;
}
export function isTeamsMobile(): boolean {
    return userAgent().indexOf('TeamsMobile-Android') !== -1 ||
           userAgent().indexOf('TeamsMobile-iOS') !== -1 ||
           (isMobile() && userAgent().indexOf('Teams/') !== -1);
}
export function isOutlookMobile(): boolean {
    return userAgent().indexOf('PKeyAuth/1.0') !== -1;
}
export function isM365Mobile(): boolean {
    return isTeamsMobile() || isOutlookMobile();
}