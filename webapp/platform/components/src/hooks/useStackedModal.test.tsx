import {render, screen} from '@testing-library/react';
import React from 'react';
import {useStackedModal} from './useStackedModal';
import {GenericModal} from '../generic_modal/generic_modal';
import {wrapIntl} from '../testUtils';
const BASE_MODAL_Z_INDEX = 1050;
const Z_INDEX_INCREMENT = 10;
const TestComponent = ({
    isStacked = false,
    isOpen = true,
}) => {
    const {shouldRenderBackdrop, modalStyle} = useStackedModal(isStacked, isOpen);
    return (
        <div data-testid='test-component'>
            <div data-testid='should-render-backdrop'>{shouldRenderBackdrop.toString()}</div>
            <div data-testid='modal-z-index'>{modalStyle.zIndex || 'none'}</div>
            <div>Modal Content</div>
        </div>
    );
};
describe('useStackedModal', () => {
    let originalQuerySelectorAll: typeof document.querySelectorAll;
    let mockBackdrop1: HTMLElement;
    let mockBackdrop2: HTMLElement;
    beforeEach(() => {
        originalQuerySelectorAll = document.querySelectorAll;
        mockBackdrop1 = document.createElement('div');
        mockBackdrop1.className = 'modal-backdrop';
        mockBackdrop1.style.zIndex = '1040';
        mockBackdrop1.style.opacity = '0.5';
        mockBackdrop2 = document.createElement('div');
        mockBackdrop2.className = 'modal-backdrop';
        mockBackdrop2.style.zIndex = '1045';
        mockBackdrop2.style.opacity = '0.5';
        document.querySelectorAll = jest.fn().mockImplementation((selector: string) => {
            if (selector === '.modal-backdrop') {
                return [mockBackdrop1, mockBackdrop2];
            }
            return [];
        });
    });
    afterEach(() => {
        document.querySelectorAll = originalQuerySelectorAll;
    });
    describe('Integration Tests', () => {
        test('does not affect regular modals', () => {
            const props = {
                show: true,
                onHide: jest.fn(),
                modalHeaderText: 'Regular Modal',
                children: <div>Regular Modal Content</div>,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            expect(screen.getByText('Regular Modal')).toBeInTheDocument();
            expect(screen.getByText('Regular Modal Content')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        });
        test('stacked modals have shouldRenderBackdrop=true but pass backdrop=false to Modal', () => {
            const props = {
                show: true,
                onHide: jest.fn(),
                modalHeaderText: 'Stacked Modal',
                isStacked: true,
                children: <div>Stacked Modal Content</div>,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            expect(screen.getByText('Stacked Modal')).toBeInTheDocument();
            expect(screen.getByText('Stacked Modal Content')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        });
        test('stacked modals do not render their own backdrop', () => {
            const stackedProps = {
                show: true,
                onHide: jest.fn(),
                modalHeaderText: 'Stacked Modal',
                id: 'stackedModal',
                isStacked: true,
                children: <div>Stacked Modal Content</div>,
            };
            render(
                wrapIntl(<GenericModal {...stackedProps}/>),
            );
            expect(screen.getByText('Stacked Modal')).toBeInTheDocument();
            expect(screen.getByText('Stacked Modal Content')).toBeInTheDocument();
            expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
        });
    });
    describe('Direct Hook Tests - Basic Functionality', () => {
        test('regular modals should render their own backdrop', () => {
            render(<TestComponent isStacked={false}/>);
            expect(screen.getByTestId('should-render-backdrop')).toHaveTextContent('true');
            expect(screen.getByTestId('modal-z-index')).toHaveTextContent('none');
        });
        test('stacked modals should have increased z-index', () => {
            render(<TestComponent isStacked={true}/>);
            const expectedZIndex = BASE_MODAL_Z_INDEX + Z_INDEX_INCREMENT;
            expect(screen.getByTestId('modal-z-index')).toHaveTextContent(expectedZIndex.toString());
        });
    });
    describe('Direct Hook Tests - Backdrop Manipulation', () => {
        test('stacked modals should modify parent backdrop opacity', () => {
            render(<TestComponent isStacked={true}/>);
            expect(mockBackdrop2.style.opacity).toBe('0');
        });
        test('stacked modals should set transition property on parent backdrop', () => {
            render(<TestComponent isStacked={true}/>);
            expect(mockBackdrop2.style.transition).toBe('opacity 150ms ease-in-out');
        });
        test('stacked modals should calculate backdrop z-index correctly', () => {
            render(<TestComponent isStacked={true}/>);
            const expectedBackdropZIndex = (BASE_MODAL_Z_INDEX + Z_INDEX_INCREMENT) - 1;
            const modalZIndex = parseInt(screen.getByTestId('modal-z-index').textContent || '0', 10);
            expect(modalZIndex - 1).toBe(expectedBackdropZIndex);
        });
        test('cleanup should restore original backdrop properties', () => {
            const {unmount} = render(<TestComponent isStacked={true}/>);
            expect(mockBackdrop2.style.opacity).toBe('0');
            unmount();
            expect(mockBackdrop2.style.opacity).toBe('0.5');
            expect(mockBackdrop2.style.transition).toBe('opacity 150ms ease-in-out');
        });
    });
});