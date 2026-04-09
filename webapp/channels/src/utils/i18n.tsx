import React from 'react';
import {FormattedMessage, createIntl, createIntlCache, type IntlShape, type MessageDescriptor} from 'react-intl';
import {getCurrentLocale, getTranslations} from 'selectors/i18n';
import store from 'stores/redux_store';
const cache = createIntlCache();
let intlInstance: IntlShape | null = null;
export function setIntl(intl: IntlShape): void {
    intlInstance = intl;
}
export function getIntl(): IntlShape {
    if (intlInstance) {
        return intlInstance;
    }
    const state = store.getState();
    const locale = getCurrentLocale(state);
    return createIntl({
        locale,
        messages: getTranslations(state, locale),
    }, cache);
}
export function isMessageDescriptor(descriptor: unknown): descriptor is MessageDescriptor {
    return Boolean(descriptor && (descriptor as MessageDescriptor).id);
}
export function formatAsString(formatMessage: IntlShape['formatMessage'], messageOrDescriptor: string | MessageDescriptor | undefined): string | undefined {
    if (!messageOrDescriptor) {
        return undefined;
    }
    if (isMessageDescriptor(messageOrDescriptor)) {
        return formatMessage(messageOrDescriptor);
    }
    return messageOrDescriptor;
}
export function formatAsComponent(messageOrComponent: React.ReactNode | MessageDescriptor): React.ReactNode {
    if (isMessageDescriptor(messageOrComponent)) {
        return <FormattedMessage {...messageOrComponent}/>;
    }
    return messageOrComponent;
}
export function getMonthLong(locale: string): 'short' | 'long' {
    if (locale === 'ko') {
        return 'short';
    }
    return 'long';
}
export interface Message {
    id: string;
    defaultMessage: string;
    values?: Record<string, any>;
}