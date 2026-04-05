import timezones from 'timezones.json';
export function getTimezoneLabel(timezone = '') {
    for (let i = 0; i < timezones.length; i++) {
        const zone = timezones[i];
        if (zone.utc.includes(timezone)) {
            return zone.text;
        }
    }
    return timezone;
}