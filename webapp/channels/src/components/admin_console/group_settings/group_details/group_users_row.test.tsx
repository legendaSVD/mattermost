import {shallow} from 'enzyme';
import React from 'react';
import GroupUsersRow from 'components/admin_console/group_settings/group_details/group_users_row';
describe('components/admin_console/group_settings/group_details/GroupUsersRow', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <GroupUsersRow
                username='test'
                displayName='Test display name'
                email='test@test.com'
                userId='xxxxxxxxxxxxxxxxxxxxxxxxxx'
                lastPictureUpdate={0}
            />,
        );
        expect(wrapper).toMatchSnapshot();
    });
});