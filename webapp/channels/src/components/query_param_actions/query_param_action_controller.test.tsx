import React from 'react';
import * as ReactRedux from 'react-redux';
import {MemoryRouter, Route, useHistory} from 'react-router-dom';
import {openModal} from 'actions/views/modals';
import {renderWithContext} from 'tests/react_testing_utils';
import QueryParamActionController from './query_param_action_controller';
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn(),
}));
jest.mock('actions/views/modals', () => ({
    openModal: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useHistory: jest.fn(),
}));
describe('QueryParamActionController', () => {
    let mockDispatch: jest.Mock;
    interface MockHistory extends jest.Mock<History, [any]> {
        replace: jest.Mock;
    }
    let mockHistory: MockHistory;
    beforeEach(() => {
        mockDispatch = jest.fn();
        jest.spyOn(ReactRedux, 'useDispatch').mockReturnValue(mockDispatch);
        mockHistory = {
            replace: jest.fn(),
        } as MockHistory;
        (useHistory as jest.Mock).mockReturnValue(mockHistory);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should dispatch openModal for INVITATION modal ID when passed valid open_invitation_modal action', () => {
        renderWithContext(
            <MemoryRouter initialEntries={['/?action=open_invitation_modal']}>
                <Route
                    path='/'
                    component={QueryParamActionController}
                />
            </MemoryRouter>,
        );
        expect(mockDispatch).toHaveBeenCalledWith(
            openModal({
                modalId: 'INVITATION',
                dialogType: expect.any(Function),
            }),
        );
    });
    it('should not dispatch any action when action query parameter is not present', () => {
        renderWithContext(
            <MemoryRouter initialEntries={['/']}>
                <Route
                    path='/'
                    component={QueryParamActionController}
                />
            </MemoryRouter>,
        );
        expect(mockDispatch).not.toHaveBeenCalled();
    });
    it('should not dispatch any action when action query parameter is not in list', () => {
        renderWithContext(
            <MemoryRouter initialEntries={['/?action=invalid_action']}>
                <Route
                    path='/'
                    component={QueryParamActionController}
                />
            </MemoryRouter>,
        );
        expect(mockDispatch).not.toHaveBeenCalled();
    });
    it('should remove the action query parameter after dispatching the action', () => {
        renderWithContext(
            <MemoryRouter initialEntries={['/?action=open_invitation_modal']}>
                <Route
                    path='/'
                    component={QueryParamActionController}
                />
            </MemoryRouter>,
        );
        expect(mockDispatch).toHaveBeenCalledWith(
            openModal({
                modalId: 'INVITATION',
                dialogType: expect.any(Function),
            }),
        );
        expect(mockHistory.replace).toHaveBeenCalledWith({
            search: '',
        });
    });
});