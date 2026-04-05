import React from 'react';
import type {MessageDescriptor} from 'react-intl';
import AccordionToggleIcon from 'components/widgets/icons/accordion_toggle_icon';
import AdminPanel from './admin_panel';
type Props = {
    children?: React.ReactNode;
    className: string;
    id?: string;
    open: boolean;
    title: MessageDescriptor;
    subtitle: MessageDescriptor;
    onToggle?: React.EventHandler<React.MouseEvent>;
};
const AdminPanelTogglable = ({
    className = '',
    open = true,
    subtitle,
    title,
    children,
    id,
    onToggle,
}: Props) => {
    return (
        <AdminPanel
            className={'AdminPanelTogglable ' + className + (open ? '' : ' closed')}
            id={id}
            title={title}
            subtitle={subtitle}
            onHeaderClick={onToggle}
            button={<AccordionToggleIcon/>}
        >
            <div className='AdminPanelTogglableContent'>
                <div className='AdminPanelTogglableContentInner'>
                    {children}
                </div>
            </div>
        </AdminPanel>
    );
};
export default AdminPanelTogglable;