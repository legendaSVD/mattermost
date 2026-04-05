import {shallow} from 'enzyme';
import React from 'react';
import {TeamModes} from './team_modes';
describe('admin_console/team_channel_settings/team/TeamModes', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <TeamModes
                onToggle={jest.fn()}
                syncChecked={false}
                allAllowedChecked={false}
                allowedDomains={''}
                allowedDomainsChecked={true}
            />,
        );
        expect(wrapper).toMatchSnapshot();
    });
});