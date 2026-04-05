import {useEffect, useRef} from 'react';
const useDidUpdate: typeof useEffect = (effect, deps) => {
    const mounted = useRef(false);
    useEffect(() => {
        if (mounted.current) {
            return effect();
        }
        mounted.current = true;
    }, deps);
};
export default useDidUpdate;