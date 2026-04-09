import a11y from './a11y_controller_instance';
import type {A11yFocusEventDetail} from './constants';
import {A11yCustomEventTypes} from './constants';
export function focusElement(
    elementOrId: HTMLElement | React.RefObject<HTMLElement> | string,
    keyboardOnly = true,
    resetOriginElement = false,
) {
    if (!elementOrId) {
        return;
    }
    let target: HTMLElement | null = null;
    if (typeof elementOrId === 'string') {
        target = document.getElementById(elementOrId);
    } else if (
        typeof elementOrId === 'object' &&
        'current' in elementOrId &&
        elementOrId.current instanceof HTMLElement
    ) {
        target = elementOrId.current;
    } else if (elementOrId instanceof HTMLElement) {
        target = elementOrId;
    }
    if (target) {
        setTimeout(() => {
            document.dispatchEvent(
                new CustomEvent<A11yFocusEventDetail>(A11yCustomEventTypes.FOCUS, {
                    detail: {
                        target,
                        keyboardOnly,
                    },
                }),
            );
            if (resetOriginElement) {
                a11y.resetOriginElement();
            }
        }, 0);
    }
}
export function getFirstFocusableChild(container: HTMLElement): HTMLElement | null {
    if (!container) {
        return null;
    }
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ];
    const focusable = container.querySelector(focusableSelectors.join(', ')) as HTMLElement | null;
    return focusable || null;
}