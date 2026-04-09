import Constants from 'utils/constants';
import * as UserAgent from 'utils/user_agent';
export function cmdOrCtrlPressed(e: React.KeyboardEvent | KeyboardEvent, allowAlt = false) {
    const isMac = UserAgent.isMac();
    if (allowAlt) {
        return (isMac && e.metaKey) || (!isMac && e.ctrlKey);
    }
    return (isMac && e.metaKey) || (!isMac && e.ctrlKey && !e.altKey);
}
export function isKeyPressed(event: React.KeyboardEvent | KeyboardEvent, key: [string, number]) {
    if (event.keyCode === Constants.KeyCodes.COMPOSING[1]) {
        return false;
    }
    if (typeof event.key !== 'undefined' && event.key !== 'Unidentified' && event.key !== 'Dead') {
        const isPressedByCode = event.key === key[0] || event.key === key[0].toUpperCase();
        if (isPressedByCode) {
            return true;
        }
    }
    return event.keyCode === key[1];
}