import {parseISO, isValid, format} from 'date-fns';
import type {Moment} from 'moment-timezone';
import {getCurrentMomentForTimezone, parseDateInTimezone} from './timezone';
export enum DateReference {
    TODAY = 'today',
    TOMORROW = 'tomorrow',
    YESTERDAY = 'yesterday',
}
export const DATE_FORMAT = 'yyyy-MM-dd';
const MOMENT_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss[Z]';
export function formatDateForDisplay(date: Date, locale?: string): string {
    try {
        const userLocale = locale || navigator.language || 'en-US';
        return new Intl.DateTimeFormat(userLocale, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch {
        return date.toLocaleDateString();
    }
}
export function stringToMoment(value: string | null, timezone?: string): Moment | null {
    if (!value) {
        return null;
    }
    const relativeMoment = resolveRelativeDateToMoment(value, timezone);
    if (relativeMoment) {
        return relativeMoment;
    }
    try {
        const parsedDate = parseISO(value);
        if (!isValid(parsedDate)) {
            return null;
        }
    } catch (error) {
        return null;
    }
    return parseDateInTimezone(value, timezone);
}
export function momentToString(momentValue: Moment | null, isDateTime: boolean): string | null {
    if (!momentValue || !momentValue.isValid()) {
        return null;
    }
    if (isDateTime) {
        return momentValue.clone().utc().format(MOMENT_DATETIME_FORMAT);
    }
    const date = momentValue.toDate();
    return format(date, DATE_FORMAT);
}
function resolveRelativeDateToMoment(dateStr: string, timezone?: string): Moment | null {
    const now = getCurrentMomentForTimezone(timezone);
    switch (dateStr) {
    case DateReference.TODAY:
        return now.startOf('day');
    case DateReference.TOMORROW:
        return now.add(1, 'day').startOf('day');
    case DateReference.YESTERDAY:
        return now.subtract(1, 'day').startOf('day');
    default: {
        const dynamicMatch = dateStr.match(/^([+-]\d{1,4})([dwm])$/i);
        if (dynamicMatch) {
            const [, amount, unit] = dynamicMatch;
            const value = parseInt(amount, 10);
            if (Math.abs(value) > 9999) {
                return null;
            }
            let momentUnit: moment.unitOfTime.DurationConstructor;
            switch (unit.toLowerCase()) {
            case 'd':
                momentUnit = 'day';
                return now.add(value, momentUnit).startOf('day');
            case 'w':
                momentUnit = 'week';
                return now.add(value, momentUnit).startOf('day');
            case 'm':
                momentUnit = 'month';
                return now.add(value, momentUnit).startOf('day');
            default:
                return null;
            }
        }
        return null;
    }
    }
}
export function resolveRelativeDate(dateStr: string, timezone?: string): string {
    const relativeMoment = resolveRelativeDateToMoment(dateStr, timezone);
    if (relativeMoment) {
        return format(relativeMoment.toDate(), DATE_FORMAT);
    }
    return dateStr;
}
export function stringToDate(value: string | null): Date | null {
    if (!value) {
        return null;
    }
    const resolved = resolveRelativeDate(value);
    try {
        const parsed = parseISO(resolved);
        if (!isValid(parsed)) {
            return null;
        }
        return parsed;
    } catch (error) {
        return null;
    }
}
export function dateToString(date: Date | null): string | null {
    if (!date || isNaN(date.getTime())) {
        return null;
    }
    return format(date, DATE_FORMAT);
}