import React from 'react';
import {render} from 'tests/react_testing_utils';
import RootPortal from './root_portal';
describe('components/RootPortal', () => {
    beforeEach(() => {
        console.error = jest.fn();
    });
    test('should match snapshot', () => {
        const rootPortalDiv = document.createElement('div');
        rootPortalDiv.id = 'root-portal';
        const {getByText, container} = render(
            <RootPortal>
                <div>{'Testing Portal'}</div>
            </RootPortal>,
            {container: document.body.appendChild(rootPortalDiv)},
        );
        expect(getByText('Testing Portal')).toBeVisible();
        expect(container).toMatchSnapshot();
    });
});