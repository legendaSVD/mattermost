import intersection from 'lodash/intersection';
import isPlainObject from 'lodash/isPlainObject';
import zipObject from 'lodash/zipObject';
export function reArg<TArgs extends Record<string, unknown>, TResult>(keyOrder: Array<keyof TArgs>, func: (args: TArgs) => TResult) {
    return (...args: [TArgs] | any[]) => {
        const isConfigObjectArg = args.length === 1 && isPlainObject(args[0]);
        const objKeys = isConfigObjectArg && Object.keys(args[0]);
        const keysMatch = objKeys && intersection(objKeys, keyOrder).length === objKeys.length;
        return func(isConfigObjectArg && keysMatch ? args[0] : zipObject(keyOrder, args));
    };
}