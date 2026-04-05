import React from 'react';
import AutosizeTextarea from 'components/autosize_textarea';
import {render} from 'tests/react_testing_utils';
describe('components/AutosizeTextarea', () => {
    test('should match snapshot, init', () => {
        const {container} = render(
            <AutosizeTextarea/>,
        );
        expect(container).toMatchSnapshot();
    });
});