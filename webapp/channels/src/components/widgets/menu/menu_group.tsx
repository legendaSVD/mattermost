import React from 'react';
import './menu_group.scss';
type Props = {
    divider?: React.ReactNode;
    children?: React.ReactNode;
};
const MenuGroup = (props: Props) => {
    const handleDividerClick = (e: React.MouseEvent): void => {
        e.preventDefault();
        e.stopPropagation();
    };
    const divider = props.divider ?? (
        <li
            className='MenuGroup menu-divider'
            onClick={handleDividerClick}
            role='separator'
        />
    );
    return (
        <>
            {divider}
            {props.children}
        </>
    );
};
export default React.memo(MenuGroup);