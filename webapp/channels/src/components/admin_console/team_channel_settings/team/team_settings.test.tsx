import {shallow} from 'enzyme';
import React from 'react';
import {TeamsSettings} from './team_settings';
describe('admin_console/team_channel_settings/team/TeamSettings', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <TeamsSettings
                siteName='site'
            />,
        );
        expect(wrapper).toMatchSnapshot();
    });
});