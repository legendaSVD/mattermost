import {useMemo} from 'react';
export default function usePrefixedIds<S extends Record<string, unknown>>(prefix: string, suffixes: S): {[K in keyof S]: string} {
    const memoizedSuffixes = useMemo(() => suffixes, [prefix]);
    return useMemo(() => {
        const childIds = {
            ...memoizedSuffixes,
        } as {[K in keyof S]: string};
        for (const suffix of Object.keys(memoizedSuffixes)) {
            childIds[suffix as keyof S] = `${prefix}-${suffix}`;
        }
        return childIds;
    }, [prefix, memoizedSuffixes]);
}
export function joinIds(...ids: string[]): string {
    return ids.filter(Boolean).join(' ');
}