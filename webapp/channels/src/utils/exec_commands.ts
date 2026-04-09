export function execCommandInsertText(text: string) {
    document.execCommand('insertText', false, text);
}
export function focusAndInsertText(element: HTMLElement, text: string) {
    element.focus();
    document.execCommand('insertText', false, text);
}