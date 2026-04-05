import classNames from 'classnames';
import React, {Fragment, forwardRef} from 'react';
import type {FC, InputHTMLAttributes} from 'react';
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    className: string;
    defaultValue?: string;
    maxLength: number;
}
const MaxLengthInput: FC<InputProps> = forwardRef<HTMLInputElement, InputProps>(
    ({className, defaultValue, maxLength, ...props}: InputProps, ref) => {
        const excess: number = defaultValue ? defaultValue.length - maxLength : 0;
        const classes: string = classNames({
            MaxLengthInput: true,
            [className]: Boolean(className),
            'has-error': excess > 0,
        });
        return (
            <>
                <input
                    className={classes}
                    defaultValue={defaultValue}
                    ref={ref}
                    {...props}
                />
                {excess > 0 && (
                    <span className='MaxLengthInput__validation'>
                        {'-'}
                        {excess}
                    </span>
                )}
            </>
        );
    },
);
export default MaxLengthInput;