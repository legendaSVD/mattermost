import React, {useEffect, useState} from 'react';
import {MenuContext, useMenuContextValue} from './menu_context';
type Props = {
    children: React.ReactNode;
}
export function WithTestMenuContext({
    children,
}: Props) {
    const [show, setShow] = useState(true);
    const menuContextValue = useMenuContextValue(() => setShow(false), show);
    useEffect(() => {
        if (!show) {
            menuContextValue.handleClosed();
        }
    }, [show]);
    return (
        <MenuContext.Provider value={menuContextValue}>
            {children}
        </MenuContext.Provider>
    );
}