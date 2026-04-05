import {ELEMENT_ID_FOR_MENU_BACKDROP} from './menu';
export function openMenu(buttonId: string) {
    const menuButton = document.getElementById(buttonId);
    if (!menuButton) {
        return;
    }
    menuButton.click();
}
export function dismissMenu() {
    const menuOverlay = document.getElementById(ELEMENT_ID_FOR_MENU_BACKDROP);
    if (!menuOverlay) {
        return;
    }
    menuOverlay.click();
}