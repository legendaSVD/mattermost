import React, {useEffect, useState, useRef} from 'react';
import type {CSSProperties} from 'react';
import {Transition} from 'react-transition-group';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';
import './auto_height_switcher.scss';
export enum AutoHeightSlots {
    SLOT1 = 1,
    SLOT2 = 2,
}
type AutoHeightProps = {
    showSlot: AutoHeightSlots;
    duration?: number;
    shouldScrollIntoView?: boolean;
    slot1?: React.ReactNode | React.ReactNode[];
    slot2?: React.ReactNode | React.ReactNode[];
    onTransitionEnd?: (node?: HTMLElement) => void;
};
const AutoHeightSwitcher = ({showSlot, onTransitionEnd, slot1 = null, slot2 = null, duration = 250, shouldScrollIntoView = false}: AutoHeightProps) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const childRef = useRef<HTMLDivElement>(null);
    const prevSlot = useRef<AutoHeightProps['showSlot']>(showSlot);
    const prevHeight = useRef<number|null>(null);
    const [animate, setAnimate] = useState<boolean>(false);
    const [height, setHeight] = useState<string | number>('auto');
    const [overflow, setOverflow] = useState<string>('visible');
    const [child, setChild] = useState(showSlot === AutoHeightSlots.SLOT1 ? slot1 : slot2);
    useEffect(() => {
        if (prevSlot.current === showSlot) {
            setChild(showSlot === AutoHeightSlots.SLOT1 ? slot1 : slot2);
        } else {
            prevSlot.current = showSlot;
            setAnimate(true);
        }
    }, [showSlot, slot1, slot2]);
    useEffect(() => {
        if (shouldScrollIntoView) {
            const timeout = setTimeout(() => scrollIntoView(wrapperRef.current!, {
                behavior: 'smooth',
                scrollMode: 'if-needed',
                block: 'center',
            }), 200);
            return () => clearTimeout(timeout);
        }
        return () => {};
    }, [shouldScrollIntoView, showSlot]);
    const fixedStyles: CSSProperties = {
        transitionProperty: 'height',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'ease',
        width: '100%',
    };
    return (
        <Transition
            in={animate}
            timeout={duration}
            onEnter={() => {
                setHeight(prevHeight.current ?? childRef.current!.offsetHeight);
                setOverflow('hidden');
                setChild(showSlot === AutoHeightSlots.SLOT1 ? slot1 : slot2);
            }}
            onEntering={() => {
                setHeight(childRef.current!.offsetHeight);
            }}
            onEntered={(node: HTMLElement) => {
                prevHeight.current = childRef.current!.offsetHeight;
                setHeight('auto');
                setOverflow('visible');
                setAnimate(false);
                onTransitionEnd?.(node);
            }}
        >
            <div
                className='AutoHeight'
                ref={wrapperRef}
                style={{...fixedStyles, height, overflow}}
            >
                <div ref={childRef}>
                    {child}
                </div>
            </div>
        </Transition>
    );
};
export default AutoHeightSwitcher;