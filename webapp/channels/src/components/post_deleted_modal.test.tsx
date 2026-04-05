import React from 'react';
import {renderWithContext} from 'tests/react_testing_utils';
import PostDeletedModal from './post_deleted_modal';
describe('components/PostDeletedModal', () => {
    const baseProps = {
        onExited: jest.fn(),
    };
    test('should match snapshot', () => {
        const {baseElement} = renderWithContext(
            <PostDeletedModal {...baseProps}/>,
        );
        expect(baseElement).toMatchSnapshot();
    });
});