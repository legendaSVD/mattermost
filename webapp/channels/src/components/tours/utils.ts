import type React from 'react';
import {FINISHED} from './constant';
export type ActionType = 'next' | 'prev' | 'dismiss' | 'jump' | 'skipped'
export interface ChannelsTourTipManager {
    show: boolean;
    currentStep: number;
    tourSteps: Record<string, number>;
    handleOpen: (e: React.MouseEvent) => void;
    handleSkip: (e: React.MouseEvent) => void;
    handleDismiss: (e: React.MouseEvent) => void;
    handlePrevious: (e: React.MouseEvent) => void;
    handleNext: (e: React.MouseEvent) => void;
    handleJump: (e: React.MouseEvent, jumpStep: number) => void;
}
export const KeyCodes: Record<string, [string, number]> = {
    ENTER: ['Enter', 13],
    COMPOSING: ['Composing', 229],
};
export function isKeyPressed(event: KeyboardEvent, key: [string, number]): boolean {
    if (event.keyCode === KeyCodes.COMPOSING[1]) {
        return false;
    }
    if (typeof event.key !== 'undefined' && event.key !== 'Unidentified' && event.key !== 'Dead') {
        const isPressedByCode = event.key === key[0] || event.key === key[0].toUpperCase();
        if (isPressedByCode) {
            return true;
        }
    }
    return event.keyCode === key[1];
}
export const getLastStep = (Steps: Record<string, number>) => {
    return Object.values(Steps).reduce((maxStep, candidateMaxStep) => {
        if (candidateMaxStep > maxStep && candidateMaxStep !== FINISHED) {
            return candidateMaxStep;
        }
        return maxStep;
    }, Number.MIN_SAFE_INTEGER);
};