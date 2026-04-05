import {OutlinedInput as MUIOutlineInput} from '@mui/material';
import type {OutlinedInputProps} from '@mui/material';
import React from 'react';
export function OutlinedInput(props: OutlinedInputProps) {
    return (
        <MUIOutlineInput
            {...props}
        />
    );
}