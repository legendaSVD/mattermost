import type {ReactElement} from 'react';
import {useState, useCallback, useEffect} from 'react';
import {useSelector} from 'react-redux';
import type {GlobalState} from 'types/store';
export class BatchProcessingError<T = Error> extends Error {
    cause?: {[key: string]: T};
}
export type SectionHook = SectionIO & {
    content: ReactElement;
}
export type SectionIO = {
    save: () => void;
    cancel: () => void;
    loading: boolean;
    saving: boolean;
    saveError: Error | undefined;
    hasChanges: boolean;
    isValid: boolean;
};
export type TLoadingState<TError extends Error> = boolean | TError;
const status = <T extends Error>(state: TLoadingState<T>) => {
    const loading = state === true;
    const error = state instanceof Error ? state : undefined;
    return {loading, error};
};
export const useOperationStatus = <T extends Error>(initialState: TLoadingState<T>) => {
    const [state, setState] = useState<TLoadingState<T>>(initialState);
    return [status(state), setState] as const;
};
export type ReadOperations<T> = {
    get: () => Promise<T | undefined>;
    select?: (state: GlobalState) => T | undefined;
    opts?: {forceInitialGet: boolean; initial?: Partial<T>};
}
export interface CollectionIO<T extends {id: string}> {
    create?: (patch?: Partial<T>) => void;
    update?: (item: T) => void;
    delete?: ((item: T) => void) | ((id: T['id']) => void);
    reorder?: (item: T, nextOrder: number) => void;
}
export function useOperation<T, TArgs extends unknown[], TErr extends Error>(op: (...args: TArgs) => T | undefined | Promise<T | undefined>, initialStatus = true) {
    const [status, setStatus] = useOperationStatus<TErr>(initialStatus);
    const doOp = useCallback(async (...args: TArgs) => {
        setStatus(true);
        try {
            const response = await op(...args);
            setStatus(false);
            return response;
        } catch (err) {
            setStatus(err);
            return undefined;
        }
    }, [op]);
    return [doOp, status, setStatus] as const;
}
export function useThing<T>(ops: ReadOperations<T>, initial: T) {
    const forceInitialGet = ops.opts?.forceInitialGet ?? true;
    const selected = useSelector<GlobalState, T | undefined>((state) => ops.select?.(state));
    const [data, setData] = useState<T>(initial);
    const [get, status] = useOperation(ops.get, forceInitialGet || !selected);
    useEffect(() => {
        if (forceInitialGet || !selected) {
            get().then((value) => {
                if (value !== undefined) {
                    setData(value);
                }
            });
        }
    }, [forceInitialGet, selected, get, setData]);
    return [selected ?? data, {...status, get, setData}] as const;
}
export function usePendingThing<T extends Record<string, unknown>, TErr extends Error>(
    data: T,
    opts: {
        commit: (pending: T, current: T) => T | Promise<T>;
        beforeUpdate?: (pending: T, current: T) => T;
    },
) {
    const [pending, setPending] = useState(data);
    const hasChanges = pending !== data;
    const [doCommit, {loading: saving, error}, setStatus] = useOperation<T, Parameters<typeof opts.commit>, TErr>(opts.commit, false);
    useEffect(() => {
        setPending(data);
    }, [setPending, data]);
    const apply = useCallback((update: T | ((current: T) => T)) => {
        setPending((currentPending) => {
            const next = typeof update === 'function' ? update(currentPending) : ({...currentPending, ...update});
            if (opts.beforeUpdate) {
                return opts?.beforeUpdate(next, data);
            }
            return next;
        });
    }, [setPending, data, opts.beforeUpdate]);
    const reset = useCallback(() => {
        setPending(data);
        setStatus(false);
    }, [setPending, data, setStatus]);
    const commit = useCallback(() => {
        return doCommit(pending, data);
    }, [doCommit, pending, data]);
    return [pending, {saving, error, hasChanges, apply, commit, reset}] as const;
}