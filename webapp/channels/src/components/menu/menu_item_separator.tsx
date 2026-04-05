import {Divider} from '@mui/material';
import type {DividerProps} from '@mui/material';
import type {ElementType} from 'react';
import React from 'react';
export function MenuItemSeparator(props: DividerProps & {component?: ElementType }) {
    return (
        <Divider
            aria-orientation='vertical'
            {...props}
        />
    );
}