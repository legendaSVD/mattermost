import React from 'react';
import './menu_header.scss';
type Props = {
    children?: React.ReactNode;
    onClick?: () => void;
}
const MenuHeader = ({children, onClick}: Props) => {
    return (
        <li
            className='MenuHeader'
            onClick={onClick}
        >
            {children}
        </li>
    );
};
export default React.memo(MenuHeader);