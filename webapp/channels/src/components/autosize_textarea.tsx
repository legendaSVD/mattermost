import type {ChangeEvent, FormEvent, HTMLProps} from 'react';
import React, {useRef, useEffect, useCallback, useState} from 'react';
import type {Intersection} from '@mattermost/types/utilities';
type Props = {
    id?: string;
    className?: string;
    disabled?: boolean;
    value?: string;
    defaultValue?: string;
    onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onHeightChange?: (height: number, maxHeight: number) => void;
    onWidthChange?: (width: number) => void;
    onInput?: (e: FormEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
} & Intersection<HTMLProps<HTMLTextAreaElement>, HTMLProps<HTMLDivElement>>;
const styles = {
    container: {
        height: 0,
        overflow: 'hidden',
    },
    reference: {
        height: 'auto',
        width: 'auto',
        display: 'inline-block',
        position: 'relative' as const,
        transform: 'translateY(-100%)',
        wordBreak: 'break-word' as const,
    },
    placeholder: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity: 0.75,
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        whiteSpace: 'nowrap' as const,
        background: 'none',
        borderColor: 'transparent',
    },
    textArea: {
        overflowY: 'hidden' as const,
    },
    textAreaWithScroll: {
        overflowY: 'auto' as const,
    },
};
const AutosizeTextarea = React.forwardRef<HTMLTextAreaElement, Props>(({
    id = 'autosize_textarea',
    disabled,
    value,
    defaultValue,
    onChange,
    onHeightChange,
    onWidthChange,
    onInput,
    placeholder,
    ...otherProps
}: Props, ref) => {
    const height = useRef(0);
    const textarea = useRef<HTMLTextAreaElement>();
    const referenceRef = useRef<HTMLDivElement>(null);
    const [showScrollbar, setShowScrollbar] = useState(false);
    const recalculateHeight = () => {
        if (!referenceRef.current || !textarea.current) {
            return;
        }
        const scrollHeight = referenceRef.current.scrollHeight;
        const currentTextarea = textarea.current;
        if (scrollHeight > 0 && scrollHeight !== height.current) {
            const style = getComputedStyle(currentTextarea);
            currentTextarea.style.height = `${scrollHeight}px`;
            height.current = scrollHeight;
            setShowScrollbar(scrollHeight > 44);
            onHeightChange?.(scrollHeight, parseInt(style.maxHeight || '0', 10));
        }
    };
    const recalculateWidth = () => {
        if (!referenceRef.current) {
            return;
        }
        const width = referenceRef.current?.offsetWidth || -1;
        if (width >= 0) {
            window.requestAnimationFrame(() => {
                onWidthChange?.(width);
            });
        }
    };
    const setTextareaRef = useCallback((textareaRef: HTMLTextAreaElement) => {
        if (ref) {
            if (typeof ref === 'function') {
                ref(textareaRef);
            } else {
                ref.current = textareaRef;
            }
        }
        textarea.current = textareaRef;
    }, [ref]);
    useEffect(() => {
        recalculateHeight();
        recalculateWidth();
    });
    const heightProps = {
        rows: 0,
        height: 0,
    };
    if (height.current <= 0) {
        heightProps.rows = 1;
    } else {
        heightProps.height = height.current;
    }
    let referenceValue = value || defaultValue;
    if (referenceValue?.endsWith('\n')) {
        referenceValue += '\n';
    }
    return (
        <div >
            <textarea
                ref={setTextareaRef}
                data-testid={id}
                id={id}
                {...heightProps}
                {...otherProps}
                placeholder={placeholder}
                role='textbox'
                dir='auto'
                disabled={disabled}
                onChange={onChange}
                onInput={onInput}
                value={value}
                defaultValue={defaultValue}
                style={showScrollbar ? styles.textAreaWithScroll : styles.textArea}
            />
            <div style={styles.container}>
                <div
                    ref={referenceRef}
                    id={id + '-reference'}
                    className={otherProps.className}
                    style={styles.reference}
                    dir='auto'
                    disabled={true}
                    aria-hidden={true}
                >
                    {referenceValue}
                </div>
            </div>
        </div>
    );
});
export default React.memo(AutosizeTextarea);