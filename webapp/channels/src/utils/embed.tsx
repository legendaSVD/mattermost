export function isEmbedded(): boolean {
    try {
        return window.self !== window.parent;
    } catch (e) {
        return true;
    }
}