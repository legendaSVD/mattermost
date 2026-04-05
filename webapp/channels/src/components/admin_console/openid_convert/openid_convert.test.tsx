import {shallow} from 'enzyme';
import React from 'react';
import OpenIdConvert from 'components/admin_console/openid_convert/openid_convert';
describe('components/OpenIdConvert', () => {
    const baseProps = {
        actions: {
            patchConfig: jest.fn(),
        },
    };
    test('should match snapshot', () => {
        const wrapper = shallow(
            <OpenIdConvert {...baseProps}/>,
        );
        expect(wrapper).toMatchSnapshot();
    });
});