import type {MutableRefObject} from 'react';
import {useEffect} from 'react';
export function useClickOutsideRef(ref: MutableRefObject<HTMLElement | null>, handler: (event: MouseEvent) => void): void {
    useEffect(() => {
        function onMouseDown(event: MouseEvent) {
            const target = event.target as any;
            if (ref.current && target instanceof Node && !ref.current.contains(target)) {
                handler(event);
            }
        }
        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, [ref, handler]);
}