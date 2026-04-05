import classNames from 'classnames';
import type {ReactComponentLike} from 'prop-types';
import React, {useCallback, useEffect, useRef} from 'react';
import type {ReactNode} from 'react';
import {FormattedMessage} from 'react-intl';
import WithTooltip from 'components/with_tooltip';
export type Props = {
    inputComponent?: ReactComponentLike;
    value?: string;
    clearable?: boolean;
    clearableTooltipText?: string | ReactNode;
    onClear?: () => void;
    clearClassName?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyUp?: (event: React.KeyboardEvent) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
    clearableWithoutValue?: boolean;
    forwardedRef?: ((instance: HTMLInputElement | HTMLTextAreaElement | null) => void) | React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null> | null;
    maxLength?: number;
    className?: string;
    placeholder?: string;
    autoFocus?: boolean;
    type?: string;
    id?: string;
    onInput?: (e?: React.FormEvent<HTMLInputElement>) => void;
    tabIndex?: number;
    size?: 'md' | 'lg';
    role?: string;
}
const defaultClearableTooltipText = (
    <FormattedMessage
        id={'input.clear'}
        defaultMessage='Clear'
    />);
export const QuickInput = React.memo(({
    value = '',
    clearable = false,
    autoFocus,
    forwardedRef,
    inputComponent,
    clearClassName,
    clearableWithoutValue,
    clearableTooltipText,
    onClear: onClearFromProps,
    className,
    size = 'md',
    ...restProps
}: Props) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    useEffect(() => {
        if (autoFocus) {
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, []);
    useEffect(() => {
        if (!inputRef.current || inputRef.current.value === value) {
            return;
        }
        inputRef.current.value = value;
    }, [value]);
    const setInputRef = useCallback((input: HTMLInputElement) => {
        if (forwardedRef) {
            if (typeof forwardedRef === 'function') {
                forwardedRef(input);
            } else {
                forwardedRef.current = input;
            }
        }
        inputRef.current = input;
    }, [forwardedRef]);
    const onClear = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClearFromProps) {
            onClearFromProps();
        }
        inputRef.current?.focus();
    }, [onClearFromProps]);
    const showClearButton = onClearFromProps && (clearableWithoutValue || (clearable && value));
    const inputElement = React.createElement(
        inputComponent || 'input',
        {
            ...restProps,
            ref: setInputRef,
            defaultValue: value,
            className: classNames(className, {
                'form-control--lg': size === 'lg',
            }),
        },
    );
    return (
        <div className='input-wrapper'>
            {inputElement}
            {showClearButton && (
                <WithTooltip title={clearableTooltipText || defaultClearableTooltipText}>
                    <button
                        data-testid='input-clear'
                        className={classNames(clearClassName, 'input-clear visible')}
                        onClick={onClear}
                    >
                        <span
                            className='input-clear-x'
                            aria-hidden='true'
                        >
                            <i className='icon icon-close-circle'/>
                        </span>
                    </button>
                </WithTooltip>
            )}
        </div>
    );
});
type ForwardedProps = Omit<React.ComponentPropsWithoutRef<typeof QuickInput>, 'forwardedRef'>;
const forwarded = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, ForwardedProps>((props, ref) => (
    <QuickInput
        forwardedRef={ref}
        {...props}
    />
));
forwarded.displayName = 'QuickInput';
export default forwarded;