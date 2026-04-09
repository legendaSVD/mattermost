import {createBrowserHistory} from 'history';
import type {History} from 'history';
import {getModule} from 'module_registry';
import DesktopApp from 'utils/desktop_api';
import {isServerVersionGreaterThanOrEqualTo} from 'utils/server_version';
import {isDesktopApp, getDesktopVersion} from 'utils/user_agent';
const b = createBrowserHistory({basename: window.basename});
const isDesktop = isDesktopApp() && isServerVersionGreaterThanOrEqualTo(getDesktopVersion(), '5.0.0');
const browserHistory = {
    ...b,
    push: (path: string | { pathname: string }, ...args: string[]) => {
        if (isDesktop) {
            DesktopApp.doBrowserHistoryPush(typeof path === 'object' ? path.pathname : path);
        } else {
            b.push(path, ...args);
        }
    },
};
if (isDesktop) {
    DesktopApp.onBrowserHistoryPush((pathName) => b.push(pathName));
}
export function getHistory() {
    return getModule<History>('utils/browser_history') ?? browserHistory;
}