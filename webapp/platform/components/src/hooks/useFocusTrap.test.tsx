import {render, screen} from '@testing-library/react';
import React, {useRef} from 'react';
import {useFocusTrap} from './useFocusTrap';
function FocusTrapTestComponent({
    isActive = true,
    initialFocus = false,
    restoreFocus = false,
    delayMs = 0,
}: {
    isActive?: boolean;
    initialFocus?: boolean;
    restoreFocus?: boolean;
    delayMs?: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    useFocusTrap(isActive, containerRef, {
        initialFocus,
        restoreFocus,
        delayMs,
    });
    return (
        <div ref={containerRef} data-testid='container'>
            <button data-testid='button1'>Button 1</button>
            <button data-testid='button2'>Button 2</button>
            <button data-testid='button3'>Button 3</button>
        </div>
    );
}
function NestedFocusTrapsComponent() {
    const outerRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    useFocusTrap(true, outerRef);
    useFocusTrap(true, innerRef);
    return (
        <div ref={outerRef} data-testid='outer-container'>
            <button data-testid='outer-button1'>Outer Button 1</button>
            <div ref={innerRef} data-testid='inner-container'>
                <button data-testid='inner-button1'>Inner Button 1</button>
                <button data-testid='inner-button2'>Inner Button 2</button>
            </div>
            <button data-testid='outer-button2'>Outer Button 2</button>
        </div>
    );
}
describe('useFocusTrap', () => {
    beforeEach(() => {
        const container = document.createElement('div');
        container.id = 'root';
        document.body.appendChild(container);
        const outsideButton = document.createElement('button');
        outsideButton.setAttribute('data-testid', 'outside-button');
        outsideButton.textContent = 'Outside Button';
        document.body.appendChild(outsideButton);
    });
    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
    });
    const simulateTabKey = (shiftKey = false) => {
        const tabEvent = new KeyboardEvent('keydown', {
            key: 'Tab',
            code: 'Tab',
            shiftKey,
            bubbles: true,
            cancelable: true,
        });
        document.dispatchEvent(tabEvent);
    };
    const simulateTabWithFocusTrap = (container: HTMLElement, shiftKey = false) => {
        const focusableElements = Array.from(
            container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ) as HTMLElement[];
        if (focusableElements.length === 0) {
            return;
        }
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const currentElement = document.activeElement as HTMLElement;
        const currentIndex = focusableElements.indexOf(currentElement);
        if (currentIndex === -1) {
            firstElement.focus();
            return;
        }
        if (shiftKey) {
            if (currentElement === firstElement) {
                lastElement.focus();
            } else {
                const prevIndex = ((currentIndex - 1) + focusableElements.length) % focusableElements.length;
                focusableElements[prevIndex].focus();
            }
        } else if (currentElement === lastElement) {
            firstElement.focus();
        } else {
            const nextIndex = (currentIndex + 1) % focusableElements.length;
            focusableElements[nextIndex].focus();
        }
    };
    test('should trap focus within the container', async () => {
        const {container} = render(<FocusTrapTestComponent />);
        const button1 = screen.getByTestId('button1');
        button1.focus();
        expect(document.activeElement).toBe(button1);
        simulateTabWithFocusTrap(container);
        expect(document.activeElement).toBe(screen.getByTestId('button2'));
        simulateTabWithFocusTrap(container);
        expect(document.activeElement).toBe(screen.getByTestId('button3'));
        simulateTabWithFocusTrap(container);
        expect(document.activeElement).toBe(button1);
        simulateTabWithFocusTrap(container, true);
        expect(document.activeElement).toBe(screen.getByTestId('button3'));
    });
    test('should set initial focus when initialFocus is true', () => {
        render(<FocusTrapTestComponent initialFocus={true} />);
        setTimeout(() => {
            expect(document.activeElement).toBe(screen.getByTestId('button1'));
        }, 0);
    });
    test('should restore focus when restoreFocus is true', () => {
        const outsideButton = screen.getByTestId('outside-button');
        outsideButton.focus();
        expect(document.activeElement).toBe(outsideButton);
        const {unmount} = render(<FocusTrapTestComponent restoreFocus={true} />);
        unmount();
        expect(document.activeElement).toBe(outsideButton);
    });
    test('should handle delay option', () => {
        jest.useFakeTimers();
        const {container} = render(<FocusTrapTestComponent delayMs={500} />);
        const button1 = screen.getByTestId('button1');
        button1.focus();
        expect(document.activeElement).toBe(button1);
        simulateTabKey();
        jest.advanceTimersByTime(500);
        button1.focus();
        simulateTabWithFocusTrap(container);
        expect(document.activeElement).toBe(screen.getByTestId('button2'));
    });
    test('should not activate when isActive is false', () => {
        render(<FocusTrapTestComponent isActive={false} />);
        const button1 = screen.getByTestId('button1');
        button1.focus();
        expect(document.activeElement).toBe(button1);
        simulateTabKey();
        expect(document.activeElement).not.toBe(screen.getByTestId('button2'));
    });
    test('should handle nested focus traps', () => {
        render(<NestedFocusTrapsComponent />);
        const innerButton1 = screen.getByTestId('inner-button1');
        innerButton1.focus();
        expect(document.activeElement).toBe(innerButton1);
        const innerContainer = screen.getByTestId('inner-container');
        simulateTabWithFocusTrap(innerContainer);
        expect(document.activeElement).toBe(screen.getByTestId('inner-button2'));
        simulateTabWithFocusTrap(innerContainer);
        expect(document.activeElement).toBe(innerButton1);
    });
    test('should handle empty containers gracefully', () => {
        function EmptyComponent() {
            const containerRef = useRef<HTMLDivElement>(null);
            useFocusTrap(true, containerRef);
            return <div ref={containerRef} data-testid='empty-container'></div>;
        }
        render(<EmptyComponent />);
        const container = screen.getByTestId('empty-container');
        expect(container).toBeInTheDocument();
    });
});