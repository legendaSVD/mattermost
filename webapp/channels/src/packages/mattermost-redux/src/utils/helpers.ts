import shallowEqual from 'shallow-equals';
import type {FieldValueType} from '@mattermost/types/properties';
import {createSelectorCreator, defaultMemoize} from 'mattermost-redux/selectors/create_selector';
export function memoizeResult<F extends Function>(func: F, measure: Function | undefined = undefined): F {
    let lastArgs: IArguments|null = null;
    let lastResult: any = null;
    return function memoizedFunc() {
        if (!shallowEqual(lastArgs, arguments)) {
            const result = Reflect.apply(func, null, arguments);
            if (!shallowEqual(lastResult, result)) {
                lastResult = result;
            }
        }
        if (measure) {
            measure();
        }
        lastArgs = arguments;
        return lastResult;
    } as unknown as F;
}
export const createIdsSelector = createSelectorCreator(memoizeResult);
export const createShallowSelector = createSelectorCreator(defaultMemoize, shallowEqual as any);
export const isMinimumServerVersion = (currentVersion: string, minMajorVersion = 0, minMinorVersion = 0, minDotVersion = 0): boolean => {
    if (!currentVersion || typeof currentVersion !== 'string') {
        return false;
    }
    const split = currentVersion.split('.');
    const major = parseInt(split[0], 10);
    const minor = parseInt(split[1] || '0', 10);
    const dot = parseInt(split[2] || '0', 10);
    if (major > minMajorVersion) {
        return true;
    }
    if (major < minMajorVersion) {
        return false;
    }
    if (minor > minMinorVersion) {
        return true;
    }
    if (minor < minMinorVersion) {
        return false;
    }
    if (dot > minDotVersion) {
        return true;
    }
    if (dot < minDotVersion) {
        return false;
    }
    return true;
};
export function generateId(): string {
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    id = id.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        let v;
        if (c === 'x') {
            v = r;
        } else {
            v = r & 0x3 | 0x8;
        }
        return v.toString(16);
    });
    return id;
}
export function isEmail(email: string): boolean {
    return (/^[^ ,@]+@[^ ,@]+$/).test(email);
}
export function getInputTypeFromValueType(valueType?: FieldValueType): string {
    return valueType === 'phone' ? 'tel' : String(valueType);
}