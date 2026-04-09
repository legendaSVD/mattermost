import {parseISO, isValid} from 'date-fns';
import {defineMessage} from 'react-intl';
import type {DialogElement} from '@mattermost/types/integrations';
const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
type DialogError = {
    id: string;
    defaultMessage: string;
    values?: any;
};
function validateDateTimeValue(value: string, elem: DialogElement): DialogError | null {
    const parsedDate = parseISO(value);
    if (!isValid(parsedDate)) {
        return defineMessage({
            id: 'interactive_dialog.error.bad_format',
            defaultMessage: 'Invalid date format',
        });
    }
    const isDateField = elem.type === 'date';
    if (isDateField) {
        if (!DATE_FORMAT_PATTERN.test(value)) {
            return defineMessage({
                id: 'interactive_dialog.error.bad_date_format',
                defaultMessage: 'Date field must be in YYYY-MM-DD format',
            });
        }
    } else if (!DATETIME_FORMAT_PATTERN.test(value)) {
        return defineMessage({
            id: 'interactive_dialog.error.bad_datetime_format',
            defaultMessage: 'DateTime field must be in YYYY-MM-DDTHH:mm:ssZ format',
        });
    }
    return null;
}
export function checkDialogElementForError(elem: DialogElement, value: any): DialogError | undefined | null {
    let isEmpty;
    if (value === 0) {
        isEmpty = false;
    } else if (Array.isArray(value)) {
        isEmpty = value.length === 0;
    } else {
        isEmpty = !value;
    }
    if (isEmpty && !elem.optional) {
        return defineMessage({
            id: 'interactive_dialog.error.required',
            defaultMessage: 'This field is required.',
        });
    }
    const type = elem.type;
    if (type === 'text' || type === 'textarea') {
        if (value && value.length < elem.min_length) {
            return defineMessage({
                id: 'interactive_dialog.error.too_short',
                defaultMessage: 'Minimum input length is {minLength}.',
            });
        }
        if (elem.subtype === 'email') {
            if (value && !value.includes('@')) {
                return defineMessage({
                    id: 'interactive_dialog.error.bad_email',
                    defaultMessage: 'Must be a valid email address.',
                });
            }
        }
        if (elem.subtype === 'number') {
            if (value && isNaN(value)) {
                return defineMessage({
                    id: 'interactive_dialog.error.bad_number',
                    defaultMessage: 'Must be a number.',
                });
            }
        }
        if (elem.subtype === 'url') {
            if (value && !value.includes('http://') && !value.includes('https://')) {
                return defineMessage({
                    id: 'interactive_dialog.error.bad_url',
                    defaultMessage: 'URL must include http:// or https://.',
                });
            }
        }
    } else if (type === 'radio') {
        const options = elem.options;
        if (typeof value !== 'undefined' && Array.isArray(options) && !options.some((e) => e.value === value)) {
            return defineMessage({
                id: 'interactive_dialog.error.invalid_option',
                defaultMessage: 'Must be a valid option',
            });
        }
    } else if (type === 'date' || type === 'datetime') {
        if (value && typeof value === 'string') {
            const validationError = validateDateTimeValue(value, elem);
            if (validationError) {
                return validationError;
            }
        }
        return null;
    }
    return null;
}
export function checkIfErrorsMatchElements(errors: Record<string, string> = {}, elements: DialogElement[] = []) {
    for (const name in errors) {
        if (!Object.hasOwn(errors, name)) {
            continue;
        }
        for (const elem of elements) {
            if (elem.name === name) {
                return true;
            }
        }
    }
    return false;
}