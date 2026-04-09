export default function deepFreezeAndThrowOnMutation(object: any): any {
    if (typeof object !== 'object' || object === null || Object.isFrozen(object) || Object.isSealed(object)) {
        return object;
    }
    for (const key in object) {
        if (Object.hasOwn(object, key)) {
            object.__defineGetter__(key, identity.bind(null, object[key]));
            object.__defineSetter__(key, throwOnImmutableMutation.bind(null, key));
        }
    }
    Object.freeze(object);
    Object.seal(object);
    for (const key in object) {
        if (Object.hasOwn(object, key)) {
            deepFreezeAndThrowOnMutation(object[key]);
        }
    }
    return object;
}
function throwOnImmutableMutation(key: string, value: any) {
    throw Error(
        'You attempted to set the key `' + key + '` with the value `' +
        JSON.stringify(value) + '` on an object that is meant to be immutable ' +
        'and has been frozen.',
    );
}
function identity(value: any): any {
    return value;
}