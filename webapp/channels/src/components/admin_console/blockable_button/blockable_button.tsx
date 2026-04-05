import React, {useCallback} from 'react';
import type {MouseEvent} from 'react';
type Props = {
    id?: string;
    activeClassName?: string;
    blocked: boolean;
    actions: {
        deferNavigation: (func: () => void) => void;
    };
    children?: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    onCancelConfirmed: () => void;
};
const BlockableButton = ({blocked, actions, onClick, onCancelConfirmed, ...restProps}: Props) => {
    const handleClick = useCallback((e: MouseEvent) => {
        onClick?.(e);
        if (blocked) {
            e.preventDefault();
            actions.deferNavigation(() => {
                onCancelConfirmed();
            });
        }
    }, [actions, blocked, onClick, onCancelConfirmed]);
    return (
        <button
            {...restProps}
            onClick={handleClick}
        />
    );
};
export default React.memo(BlockableButton);