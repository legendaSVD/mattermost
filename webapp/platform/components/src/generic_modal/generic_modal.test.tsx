import {act, render, screen, waitFor} from '@testing-library/react';
import React from 'react';
import {GenericModal} from './generic_modal';
import {wrapIntl} from '../testUtils';
describe('GenericModal', () => {
    const baseProps = {
        onExited: jest.fn(),
        modalHeaderText: 'Modal Header Text',
        children: <></>,
    };
    test('should match snapshot for base case', () => {
        const wrapper = render(
            wrapIntl(<GenericModal {...baseProps}/>),
        );
        expect(wrapper).toMatchSnapshot();
    });
    test('should have confirm and cancels buttons when handlers are passed for both buttons', () => {
        const props = {
            ...baseProps,
            handleConfirm: jest.fn(),
            handleCancel: jest.fn(),
        };
        render(
            wrapIntl(<GenericModal {...props}/>),
        );
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
    test('calls onExited when modal exits', async () => {
        const onExitedMock = jest.fn();
        const props = {
            ...baseProps,
            onExited: onExitedMock,
        };
        render(
            wrapIntl(<GenericModal {...props}/>),
        );
        const closeButton = screen.getByLabelText('Close');
        act(() => {
            closeButton.click();
        });
        await waitFor(() => {
            expect(onExitedMock).toHaveBeenCalled();
        });
    });
    test('does not throw if onExited is undefined', async () => {
        const {onExited, ...propsWithoutOnExited} = baseProps;
        const props = {
            ...propsWithoutOnExited,
            onHide: jest.fn(),
        };
        render(
            wrapIntl(<GenericModal {...props}/>),
        );
        const closeButton = screen.getByLabelText('Close');
        expect(() => {
            act(() => {
                closeButton.click();
            });
        }).not.toThrow();
    });
    test('calls onEntered when modal enters', async () => {
        const onEnteredMock = jest.fn();
        const props = {
            ...baseProps,
            onEntered: onEnteredMock,
            show: false,
        };
        const {rerender} = render(
            wrapIntl(<GenericModal {...props}/>),
        );
        rerender(
            wrapIntl(<GenericModal {...props} show={true}/>),
        );
        await waitFor(() => {
            expect(onEnteredMock).toHaveBeenCalled();
        });
    });
    test('does not throw if onEntered is undefined', async () => {
        const props = {
            ...baseProps,
            show: false,
        };
        const {rerender} = render(
            wrapIntl(<GenericModal {...props}/>),
        );
        expect(() => {
            rerender(
                wrapIntl(<GenericModal {...props} show={true}/>),
            );
        }).not.toThrow();
    });
    test('calls onHide when modal is closed', async () => {
        const onHideMock = jest.fn();
        const props = {
            ...baseProps,
            onHide: onHideMock,
        };
        render(
            wrapIntl(<GenericModal {...props}/>),
        );
        const closeButton = screen.getByLabelText('Close');
        act(() => {
            closeButton.click();
        });
        await waitFor(() => {
            expect(onHideMock).toHaveBeenCalled();
        });
    });
    describe('preventClose functionality', () => {
        test('preventClose=true prevents modal from closing when close button is clicked', async () => {
            const onHideMock = jest.fn();
            const onExitedMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                onExited: onExitedMock,
                preventClose: true,
                show: true,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            expect(modal).toBeInTheDocument();
            expect(modal).toHaveClass('in');
            const closeButton = screen.getByLabelText('Close');
            closeButton.click();
            await waitFor(() => {
                expect(onHideMock).toHaveBeenCalled();
            });
            expect(modal).toBeInTheDocument();
            expect(modal).toHaveClass('in');
            expect(onExitedMock).not.toHaveBeenCalled();
        });
        test('preventClose=true prevents modal from closing when cancel button is clicked', async () => {
            const onHideMock = jest.fn();
            const handleCancelMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                handleCancel: handleCancelMock,
                preventClose: true,
                show: true,
                autoCloseOnCancelButton: true,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            expect(modal).toHaveClass('in');
            const cancelButton = screen.getByText('Cancel');
            cancelButton.click();
            await waitFor(() => {
                expect(handleCancelMock).toHaveBeenCalled();
                expect(onHideMock).toHaveBeenCalled();
            });
            expect(modal).toHaveClass('in');
        });
        test('preventClose=true prevents modal from closing when confirm button is clicked', async () => {
            const onHideMock = jest.fn();
            const handleConfirmMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                handleConfirm: handleConfirmMock,
                preventClose: true,
                show: true,
                autoCloseOnConfirmButton: true,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            expect(modal).toHaveClass('in');
            const confirmButton = screen.getByText('Confirm');
            confirmButton.click();
            await waitFor(() => {
                expect(handleConfirmMock).toHaveBeenCalled();
                expect(onHideMock).toHaveBeenCalled();
            });
            expect(modal).toHaveClass('in');
        });
        test('preventClose=false allows normal modal closing via close button', async () => {
            const onHideMock = jest.fn();
            const onExitedMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                onExited: onExitedMock,
                preventClose: false,
                show: true,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            expect(modal).toHaveClass('in');
            const closeButton = screen.getByLabelText('Close');
            act(() => {
                closeButton.click();
            });
            await waitFor(() => {
                expect(onHideMock).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(modal).not.toHaveClass('in');
            });
        });
        test('preventClose=false allows normal modal closing via cancel button', async () => {
            const onHideMock = jest.fn();
            const handleCancelMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                handleCancel: handleCancelMock,
                preventClose: false,
                show: true,
            };
            render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            expect(modal).toHaveClass('in');
            const cancelButton = screen.getByText('Cancel');
            act(() => {
                cancelButton.click();
            });
            await waitFor(() => {
                expect(handleCancelMock).toHaveBeenCalled();
                expect(onHideMock).toHaveBeenCalled();
            });
            await waitFor(() => {
                expect(modal).not.toHaveClass('in');
            });
        });
        test('preventClose state can be toggled dynamically', async () => {
            const onHideMock = jest.fn();
            const props = {
                ...baseProps,
                onHide: onHideMock,
                preventClose: true,
                show: true,
            };
            const {rerender} = render(
                wrapIntl(<GenericModal {...props}/>),
            );
            const modal = screen.getByRole('dialog');
            const closeButton = screen.getByLabelText('Close');
            closeButton.click();
            await waitFor(() => {
                expect(onHideMock).toHaveBeenCalledTimes(1);
            });
            expect(modal).toHaveClass('in');
            rerender(
                wrapIntl(<GenericModal {...props} preventClose={false}/>),
            );
            act(() => {
                closeButton.click();
            });
            await waitFor(() => {
                expect(onHideMock).toHaveBeenCalledTimes(2);
            });
            await waitFor(() => {
                expect(modal).not.toHaveClass('in');
            });
        });
    });
});