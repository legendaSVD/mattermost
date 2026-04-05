import {shallow} from 'enzyme';
import React from 'react';
import GroupSettings from 'components/admin_console/group_settings/group_settings';
describe('components/admin_console/group_settings/GroupSettings', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <GroupSettings/>,
        );
        expect(wrapper).toMatchSnapshot();
    });
});