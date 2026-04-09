import {useLayoutEffect, useMemo, useRef, useState} from 'react';
const BASE_MODAL_Z_INDEX = 1050;
const BASE_BACKDROP_Z_INDEX = 1040;
const Z_INDEX_INCREMENT = 10;
type StackedModalResult = {
    shouldRenderBackdrop: boolean;
    modalStyle: React.CSSProperties;
    parentModalRef: React.RefObject<HTMLElement | null>;
};
export function useStackedModal(
    isStacked: boolean,
    isOpen: boolean,
): StackedModalResult {
    const [shouldRenderBackdrop, setShouldRenderBackdrop] = useState(!isStacked);
    const [zIndexes, setZIndexes] = useState({
        modal: BASE_MODAL_Z_INDEX,
        backdrop: BASE_BACKDROP_Z_INDEX,
    });
    const parentModalRef = useRef<HTMLElement | null>(null);
    const originalBackdropZIndexRef = useRef<string | null>(null);
    const backdropRef = useRef<HTMLElement | null>(null);
    const originalBackdropOpacityRef = useRef<string | null>(null);
    useLayoutEffect(() => {
        if (!isStacked) {
            return;
        }
        if (!isOpen) {
            setShouldRenderBackdrop(false);
            setZIndexes({
                modal: BASE_MODAL_Z_INDEX,
                backdrop: BASE_BACKDROP_Z_INDEX,
            });
            return;
        }
        const adjustBackdrop = () => {
            setShouldRenderBackdrop(true);
            const stackedModalZIndex = BASE_MODAL_Z_INDEX + Z_INDEX_INCREMENT;
            setZIndexes({
                modal: stackedModalZIndex,
                backdrop: stackedModalZIndex - 1,
            });
            if (typeof document !== 'undefined') {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                if (backdrops.length > 0) {
                    const parentBackdrop = backdrops[backdrops.length - 1] as HTMLElement;
                    backdropRef.current = parentBackdrop;
                    originalBackdropZIndexRef.current = parentBackdrop.style.zIndex || String(BASE_BACKDROP_Z_INDEX);
                    originalBackdropOpacityRef.current = parentBackdrop.style.opacity || '0.5';
                    parentBackdrop.style.transition = 'opacity 150ms ease-in-out';
                    parentBackdrop.style.opacity = '0';
                }
            }
        };
        adjustBackdrop();
        return () => {
            if (backdropRef.current) {
                if (originalBackdropZIndexRef.current) {
                    backdropRef.current.style.zIndex = originalBackdropZIndexRef.current;
                }
                if (originalBackdropOpacityRef.current) {
                    backdropRef.current.style.transition = 'opacity 150ms ease-in-out';
                    backdropRef.current.style.opacity = originalBackdropOpacityRef.current;
                }
                backdropRef.current = null;
                originalBackdropZIndexRef.current = null;
                originalBackdropOpacityRef.current = null;
            }
        };
    }, [isOpen, isStacked]);
    const modalStyle = useMemo(() => {
        return isStacked ? {
            zIndex: zIndexes.modal,
        } : {};
    }, [isStacked, zIndexes.modal]);
    return {
        shouldRenderBackdrop,
        modalStyle,
        parentModalRef,
    };
}
export default useStackedModal;