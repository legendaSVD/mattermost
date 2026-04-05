import React from 'react';
import type {UserPropertyField} from '@mattermost/types/properties';
import {renderWithContext, screen, waitFor} from 'tests/react_testing_utils';
import TableEditor from './table_editor';
describe('TableEditor - User Self-Exclusion', () => {
    const mockUserAttributes: UserPropertyField[] = [
        {
            id: 'attr1',
            name: 'department',
            type: 'select',
            group_id: 'custom_profile_attributes',
            create_at: 1736541716295,
            update_at: 1736541716295,
            delete_at: 0,
            attrs: {
                sort_order: 0,
                visibility: 'when_set',
                value_type: '',
                options: [
                    {id: 'eng', name: 'Engineering'},
                    {id: 'sales', name: 'Sales'},
                ],
            },
        },
    ];
    const mockActions = {
        getVisualAST: jest.fn(),
    };
    const baseProps = {
        value: 'user.attributes.department == "Engineering"',
        onChange: jest.fn(),
        userAttributes: mockUserAttributes,
        enableUserManagedAttributes: true,
        onParseError: jest.fn(),
        actions: mockActions,
    };
    beforeEach(() => {
        mockActions.getVisualAST.mockClear();
        mockActions.getVisualAST.mockResolvedValue({
            data: {
                conditions: [
                    {
                        attribute: 'user.attributes.department',
                        operator: '==',
                        value: 'Engineering',
                        value_type: 0,
                        attribute_type: 'text',
                    },
                ],
            },
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('should disable Test Access Rules button when user would be excluded', async () => {
        const mockValidateExpression = jest.fn().mockResolvedValue({
            data: {requester_matches: false},
        });
        const props = {
            ...baseProps,
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Engineering"');
        });
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).toBeDisabled();
    });
    test('should show tooltip when user would be excluded', async () => {
        const mockValidateExpression = jest.fn().mockResolvedValue({
            data: {requester_matches: false},
        });
        const props = {
            ...baseProps,
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Engineering"');
        });
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).toBeDisabled();
    });
    test('should not disable Test Access Rules button for system admins even if they would be excluded', async () => {
        const mockValidateExpression = jest.fn().mockResolvedValue({
            data: {requester_matches: false},
        });
        const props = {
            ...baseProps,
            isSystemAdmin: true,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(screen.getByRole('button', {name: /test access rule/i})).toBeInTheDocument();
        });
        expect(mockValidateExpression).not.toHaveBeenCalled();
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).not.toBeDisabled();
    });
    test('should not disable Test Access Rules button when user would not be excluded', async () => {
        const mockValidateExpression = jest.fn().mockResolvedValue({
            data: {requester_matches: true},
        });
        const props = {
            ...baseProps,
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Engineering"');
        });
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).not.toBeDisabled();
    });
    test('should handle validation errors gracefully', async () => {
        const mockValidateExpression = jest.fn().mockRejectedValue(new Error('Validation failed'));
        const props = {
            ...baseProps,
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Engineering"');
        });
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).not.toBeDisabled();
    });
    test('should not validate when expression is empty', async () => {
        const mockValidateExpression = jest.fn();
        const props = {
            ...baseProps,
            value: '',
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(screen.getByRole('button', {name: /test access rule/i})).toBeInTheDocument();
        });
        expect(mockValidateExpression).not.toHaveBeenCalled();
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).toBeDisabled();
    });
    test('should not validate when validateExpressionAgainstRequester is not provided', async () => {
        const props = {
            ...baseProps,
            isSystemAdmin: false,
        };
        renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(screen.getByRole('button', {name: /test access rule/i})).toBeInTheDocument();
        });
        const testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).not.toBeDisabled();
    });
    test('should re-validate when expression changes', async () => {
        const mockValidateExpression = jest.fn().
            mockResolvedValueOnce({data: {requester_matches: true}}).
            mockResolvedValueOnce({data: {requester_matches: false}});
        const props = {
            ...baseProps,
            isSystemAdmin: false,
            validateExpressionAgainstRequester: mockValidateExpression,
        };
        const {rerender} = renderWithContext(<TableEditor {...props}/>, {});
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Engineering"');
        });
        let testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).not.toBeDisabled();
        const newProps = {
            ...props,
            value: 'user.attributes.department == "Sales"',
        };
        rerender(<TableEditor {...newProps}/>);
        await waitFor(() => {
            expect(mockValidateExpression).toHaveBeenCalledWith('user.attributes.department == "Sales"');
        });
        testButton = screen.getByRole('button', {name: /test access rule/i});
        expect(testButton).toBeDisabled();
    });
});