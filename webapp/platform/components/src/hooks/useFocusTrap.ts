import {useEffect, useRef} from 'react';
const activeFocusTraps: HTMLElement[] = [];
type FocusTrapOptions = {
    initialFocus?: boolean;
    restoreFocus?: boolean;
    delayMs?: number;
};
export function useFocusTrap(
    isActive: boolean,
    containerRef: React.RefObject<HTMLElement>,
    options: FocusTrapOptions = {initialFocus: false, restoreFocus: false},
): void {
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const focusableElementsRef = useRef<HTMLElement[]>([]);
    useEffect(() => {
        const container = containerRef.current;
        if (!isActive || !container) {
            return;
        }
        if (options.restoreFocus) {
            previousFocusRef.current = document.activeElement as HTMLElement;
        }
        let timeoutId: NodeJS.Timeout | null = null;
        let trapActive = false;
        const activateFocusTrap = () => {
            focusableElementsRef.current = getFocusableElements(container);
            activeFocusTraps.push(container);
            trapActive = true;
            if (focusableElementsRef.current.length === 0) {
                return;
            }
            if (options.initialFocus && focusableElementsRef.current.length > 0) {
                focusableElementsRef.current[0].focus();
            }
        };
        const refreshFocusableElements = () => {
            focusableElementsRef.current = getFocusableElements(container);
        };
        if (options.delayMs && options.delayMs > 0) {
            timeoutId = setTimeout(activateFocusTrap, options.delayMs);
        } else {
            activateFocusTrap();
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') {
                return;
            }
            if (!trapActive || activeFocusTraps[activeFocusTraps.length - 1] !== container) {
                return;
            }
            const elements = focusableElementsRef.current;
            if (elements.length === 0) {
                return;
            }
            const firstElement = elements[0];
            const lastElement = elements[elements.length - 1];
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        };
        const observer = new MutationObserver(() => {
            if (trapActive) {
                refreshFocusableElements();
            }
        });
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['tabindex', 'disabled'],
        });
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            observer.disconnect();
            document.removeEventListener('keydown', handleKeyDown);
            if (trapActive) {
                const index = activeFocusTraps.indexOf(container);
                if (index > -1) {
                    activeFocusTraps.splice(index, 1);
                }
            }
            if (options.restoreFocus && previousFocusRef.current) {
                previousFocusRef.current.focus();
            }
        };
    }, [isActive, containerRef, options.initialFocus, options.restoreFocus, options.delayMs]);
}
function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    return elements.filter((element) => isElementVisible(element));
}
function isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
        return false;
    }
    let currentElement: HTMLElement | null = element;
    while (currentElement) {
        const style = window.getComputedStyle(currentElement);
        if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.pointerEvents === 'none' ||
            currentElement.hasAttribute('hidden')
        ) {
            return false;
        }
        currentElement = currentElement.parentElement;
    }
    return true;
}