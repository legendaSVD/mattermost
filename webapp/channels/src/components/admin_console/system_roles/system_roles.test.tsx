import {shallow} from 'enzyme';
import React from 'react';
import {TestHelper} from 'utils/test_helper';
import SystemRoles from './system_roles';
describe('admin_console/system_roles', () => {
    test('should match snapshot', () => {
        const roles = {
            system_admin: TestHelper.getRoleMock({
                id: 'system_admin',
                name: 'system_admin',
                permissions: ['some', 'random', 'permissions'],
            }),
        };
        const wrapper = shallow(
            <SystemRoles
                roles={roles}
            />);
        expect(wrapper).toMatchSnapshot();
    });
});