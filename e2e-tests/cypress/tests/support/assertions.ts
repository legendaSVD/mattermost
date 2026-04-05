export function beRead(items) {
    expect(items).to.have.length(1);
    expect(items[0].className).to.not.match(/unread-title/);
}
export function beUnread(items) {
    expect(items).to.have.length(1);
    expect(items[0].className).to.match(/unread-title/);
}
export function beMuted(items) {
    expect(items).to.have.length(1);
    expect(items[0].className).to.match(/muted/);
}
export function beUnmuted(items) {
    expect(items).to.have.length(1);
    expect(items[0].className).to.not.match(/muted/);
}