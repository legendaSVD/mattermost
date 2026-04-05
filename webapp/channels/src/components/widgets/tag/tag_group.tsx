import classNames from 'classnames';
import React from 'react';
import './tag_group.scss';
export type TagGroupProps = {
    children: React.ReactNode;
    className?: string;
};
const TagGroup: React.FC<TagGroupProps> = ({
    children,
    className,
}) => {
    return (
        <div className={classNames('TagGroup', className)}>
            {children}
        </div>
    );
};
export default TagGroup;