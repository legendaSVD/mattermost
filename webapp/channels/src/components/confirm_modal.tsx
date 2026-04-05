import React, {memo, useCallback, useState} from 'react';
import {FormattedMessage} from 'react-intl';
import {GenericModal} from '@mattermost/components';
import {focusElement} from 'utils/a11y_utils';
import './confirm_modal.scss';
type Props = {
    id?: string;
    show: boolean;
    title?: React.ReactNode;
    message?: React.ReactNode;
    confirmButtonClass?: string;
    modalClass?: string;
    confirmButtonText?: React.ReactNode;
    cancelButtonText?: React.ReactNode;
    showCheckbox?: boolean;
    checkboxText?: React.ReactNode;
    checkboxClass?: string;
    checkboxInFooter?: boolean;
    onConfirm?: (checked: boolean) => void;
    onCancel?: (checked: boolean) => void;
    onCheckboxChange?: (checked: boolean) => void;
    onExited?: () => void;
    hideCancel?: boolean;
    hideConfirm?: boolean;
    confirmDisabled?: boolean;
    focusOriginElement?: string;
    isStacked?: boolean;
};
const ConfirmModal = ({
    title = '',
    message = '',
    confirmButtonClass = 'btn btn-primary',
    confirmButtonText = '',
    modalClass = '',
    id,
    show,
    focusOriginElement,
    isStacked,
    showCheckbox,
    checkboxText,
    checkboxClass,
    checkboxInFooter,
    cancelButtonText,
    hideCancel,
    hideConfirm,
    confirmDisabled,
    onConfirm,
    onCancel,
    onCheckboxChange,
    onExited,
}: Props) => {
    const [checked, setChecked] = useState(false);
    const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setChecked(e.target.checked);
        onCheckboxChange?.(e.target.checked);
    }, [onCheckboxChange]);
    const handleConfirm = useCallback(() => {
        onConfirm?.(checked);
    }, [checked, onConfirm]);
    const handleCancel = useCallback(() => {
        onCancel?.(checked);
    }, [checked, onCancel]);
    const handleExited = useCallback(() => {
        onExited?.();
        if (focusOriginElement) {
            focusElement(focusOriginElement, true);
        }
    }, [focusOriginElement, onExited]);
    let checkbox;
    if (showCheckbox) {
        const checkboxContainerClass = checkboxClass || 'checkbox text-right mb-0';
        checkbox = (
            <div className={checkboxContainerClass}>
                <label>
                    <input
                        type='checkbox'
                        onChange={handleCheckboxChange}
                        checked={checked}
                    />
                    {checkboxText}
                </label>
            </div>
        );
    }
    let cancelText;
    if (cancelButtonText) {
        cancelText = cancelButtonText;
    } else {
        cancelText = (
            <FormattedMessage
                id='confirm_modal.cancel'
                defaultMessage='Cancel'
            />
        );
    }
    let cancelButton;
    if (!hideCancel) {
        cancelButton = (
            <button
                type='button'
                data-testid='cancel-button'
                className='btn btn-tertiary'
                onClick={handleCancel}
                id='cancelModalButton'
            >
                {cancelText}
            </button>
        );
    }
    return (
        <GenericModal
            id={id || 'confirmModal'}
            className={`ConfirmModal a11y__modal ${modalClass}`}
            show={show}
            onHide={handleCancel}
            onExited={handleExited}
            ariaLabelledby='confirmModalLabel'
            compassDesign={true}
            modalHeaderText={title}
            isStacked={isStacked}
        >
            <div
                data-testid={id}
            >
                <div
                    className='ConfirmModal__body'
                    id='confirmModalBody'
                >
                    {message}
                    {!checkboxInFooter && checkbox}
                </div>
                <div className='ConfirmModal__footer'>
                    {checkboxInFooter && checkbox}
                    {cancelButton}
                    {!hideConfirm && (
                        <button
                            type='button'
                            className={confirmButtonClass}
                            onClick={handleConfirm}
                            id='confirmModalButton'
                            autoFocus={true}
                            disabled={confirmDisabled}
                        >
                            {confirmButtonText}
                        </button>
                    )}
                </div>
            </div>
        </GenericModal>
    );
};
export default memo(ConfirmModal);