import React from 'react';
import {renderWithContext} from 'tests/react_testing_utils';
import {ShortcutKey, ShortcutKeyVariant} from './shortcut_key';
describe('components/ShortcutKey', () => {
    test('should match snapshot for regular key', () => {
        const {container} = renderWithContext(<ShortcutKey>{'Shift'}</ShortcutKey>);
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot for contrast key', () => {
        const {container} = renderWithContext(<ShortcutKey variant={ShortcutKeyVariant.Contrast}>{'Shift'}</ShortcutKey>);
        expect(container).toMatchSnapshot();
    });
});