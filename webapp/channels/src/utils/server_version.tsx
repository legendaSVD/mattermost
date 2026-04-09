export function isServerVersionGreaterThanOrEqualTo(currentVersion: string, compareVersion: string): boolean {
    if (currentVersion === compareVersion) {
        return true;
    }
    const currentVersionNumber = (currentVersion || '').split('.').filter((x) => (/^[0-9]+$/).exec(x) !== null);
    const compareVersionNumber = (compareVersion || '').split('.').filter((x) => (/^[0-9]+$/).exec(x) !== null);
    for (let i = 0; i < Math.max(currentVersionNumber.length, compareVersionNumber.length); i++) {
        const currentVersion = parseInt(currentVersionNumber[i], 10) || 0;
        const compareVersion = parseInt(compareVersionNumber[i], 10) || 0;
        if (currentVersion > compareVersion) {
            return true;
        }
        if (currentVersion < compareVersion) {
            return false;
        }
    }
    return true;
}