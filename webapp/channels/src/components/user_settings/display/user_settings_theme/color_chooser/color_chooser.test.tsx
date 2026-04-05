import React from 'react';
import {render} from 'tests/react_testing_utils';
import ColorChooser from './color_chooser';
describe('components/user_settings/display/ColorChooser', () => {
    it('should match, init', () => {
        const {container} = render(
            <ColorChooser
                label='Choose color'
                id='choose-color'
                value='#ffeec0'
            />,
        );
        expect(container).toMatchSnapshot();
    });
});