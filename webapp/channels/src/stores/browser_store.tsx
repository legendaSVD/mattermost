import {getHistory} from 'utils/browser_history';
import {ErrorPageTypes, StoragePrefixes, LandingPreferenceTypes} from 'utils/constants';
import * as Utils from 'utils/utils';
class BrowserStoreClass {
    private hasCheckedLocalStorage?: boolean;
    private localStorageSupported?: boolean;
    signalLogout() {
        if (this.isLocalStorageSupported()) {
            const logoutId = Utils.generateId();
            Utils.removePrefixFromLocalStorage(StoragePrefixes.ANNOUNCEMENT);
            Utils.removePrefixFromLocalStorage(StoragePrefixes.DELINQUENCY);
            sessionStorage.setItem(StoragePrefixes.LOGOUT, logoutId);
            localStorage.setItem(StoragePrefixes.LOGOUT, logoutId);
            localStorage.removeItem(StoragePrefixes.LOGOUT);
        }
    }
    isSignallingLogout(logoutId: string) {
        return logoutId === sessionStorage.getItem(StoragePrefixes.LOGOUT);
    }
    signalLogin() {
        if (this.isLocalStorageSupported()) {
            const loginId = Utils.generateId();
            sessionStorage.setItem(StoragePrefixes.LOGIN, loginId);
            localStorage.setItem(StoragePrefixes.LOGIN, loginId);
            localStorage.removeItem(StoragePrefixes.LOGIN);
        }
    }
    isSignallingLogin(loginId: string) {
        return loginId === sessionStorage.getItem(StoragePrefixes.LOGIN);
    }
    isLocalStorageSupported() {
        if (this.hasCheckedLocalStorage) {
            return this.localStorageSupported;
        }
        this.localStorageSupported = false;
        try {
            localStorage.setItem('__testLocal__', '1');
            if (localStorage.getItem('__testLocal__') === '1') {
                this.localStorageSupported = true;
            }
            localStorage.removeItem('__testLocal__');
        } catch (e) {
            this.localStorageSupported = false;
        }
        try {
            sessionStorage.setItem('__testSession__', '1');
            sessionStorage.removeItem('__testSession__');
        } catch (e) {
            getHistory().push('/error?type=' + ErrorPageTypes.LOCAL_STORAGE);
        }
        this.hasCheckedLocalStorage = true;
        return this.localStorageSupported;
    }
    hasSeenLandingPage() {
        return localStorage.getItem(StoragePrefixes.LANDING_PAGE_SEEN);
    }
    setLandingPageSeen(landingPageSeen: boolean) {
        localStorage.setItem(StoragePrefixes.LANDING_PAGE_SEEN, String(landingPageSeen));
    }
    getLandingPreference(siteUrl?: string) {
        return localStorage.getItem(StoragePrefixes.LANDING_PREFERENCE + String(siteUrl));
    }
    setLandingPreferenceToMattermostApp(siteUrl?: string) {
        localStorage.setItem(StoragePrefixes.LANDING_PREFERENCE + String(siteUrl), LandingPreferenceTypes.MATTERMOSTAPP);
    }
    setLandingPreferenceToBrowser(siteUrl?: string) {
        localStorage.setItem(StoragePrefixes.LANDING_PREFERENCE + String(siteUrl), LandingPreferenceTypes.BROWSER);
    }
    clearLandingPreference(siteUrl?: string) {
        localStorage.removeItem(StoragePrefixes.LANDING_PREFERENCE + String(siteUrl));
    }
    getHideNotificationPermissionRequestBanner() {
        return localStorage.getItem(StoragePrefixes.HIDE_NOTIFICATION_PERMISSION_REQUEST_BANNER) === 'true';
    }
    setHideNotificationPermissionRequestBanner() {
        localStorage.setItem(StoragePrefixes.HIDE_NOTIFICATION_PERMISSION_REQUEST_BANNER, 'true');
    }
    clearHideNotificationPermissionRequestBanner() {
        localStorage.removeItem(StoragePrefixes.HIDE_NOTIFICATION_PERMISSION_REQUEST_BANNER);
    }
}
const BrowserStore = new BrowserStoreClass();
export default BrowserStore;