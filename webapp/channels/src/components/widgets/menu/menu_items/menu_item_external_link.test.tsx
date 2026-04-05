import {shallow} from 'enzyme';
import React from 'react';
import {MenuItemExternalLinkImpl} from './menu_item_external_link';
describe('components/MenuItemExternalLink', () => {
    test('should match snapshot', () => {
        const wrapper = shallow(
            <MenuItemExternalLinkImpl
                url='http://test.com'
                text='Whatever'
            />,
        );
        expect(wrapper).toMatchInlineSnapshot(`
            <ForwardRef
              href="http://test.com"
              location="menu_item_external_link"
            >
              <span
                className="MenuItem__primary-text"
              >
                Whatever
              </span>
            </ForwardRef>
        `);
    });
});