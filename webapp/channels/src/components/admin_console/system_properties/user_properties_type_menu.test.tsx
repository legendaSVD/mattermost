import React from 'react';
import type {UserPropertyField} from '@mattermost/types/properties';
import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';
import SelectType from './user_properties_type_menu';
describe('UserPropertyTypeMenu', () => {
    const baseField: UserPropertyField = {
        id: 'test-id',
        name: 'Test Field',
        type: 'text' as const,
        group_id: 'custom_profile_attributes',
        create_at: 1736541716295,
        delete_at: 0,
        update_at: 0,
        attrs: {
            sort_order: 0,
            visibility: 'when_set' as const,
            value_type: '',
        },
    };
    const updateField = jest.fn();
    const renderComponent = (field: UserPropertyField = baseField) => {
        return renderWithContext(
            <SelectType
                field={field}
                updateField={updateField}
            />,
        );
    };
    it('renders with correct current type', () => {
        renderComponent();
        expect(screen.getByText('Text')).toBeInTheDocument();
    });
    it('renders legacy text field with no value_type in attrs', () => {
        const legacyField = {
            ...baseField,
            type: 'text' as const,
            attrs: {
                sort_order: 0,
            },
        };
        renderComponent(legacyField as UserPropertyField);
        expect(screen.getByText('Text')).toBeInTheDocument();
    });
    it('disables menu button when field is marked for deletion', () => {
        const deletedField = {
            ...baseField,
            delete_at: 123456789,
        };
        renderComponent(deletedField);
        const menuButton = screen.getByTestId('fieldTypeSelectorMenuButton');
        expect(menuButton).toBeDisabled();
    });
    it('changes field type when a new type is selected', async () => {
        renderComponent();
        await userEvent.click(screen.getByText('Text'));
        await userEvent.click(screen.getByText('Phone'));
        expect(updateField).toHaveBeenCalledWith({
            ...baseField,
            type: 'text',
            attrs: {
                ...baseField.attrs,
                value_type: 'phone',
            },
        });
    });
    it('filters options when searching', async () => {
        renderComponent();
        await userEvent.click(screen.getByText('Text'));
        const filterInput = screen.getByRole('textbox', {name: 'Attribute type'});
        await userEvent.clear(filterInput);
        await userEvent.type(filterInput, 'multi');
        expect(screen.getByText('Multi-select')).toBeInTheDocument();
        expect(screen.getAllByRole('menuitemradio')).toHaveLength(1);
    });
    it('disables non-supported options when ldap-linked', async () => {
        renderComponent({...baseField, attrs: {...baseField.attrs, ldap: 'ldapPropName'}});
        await userEvent.click(screen.getByText('Text'));
        expect(screen.getByRole('menuitemradio', {name: 'Phone'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'URL'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Select'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Multi-select'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Select'})).toHaveAttribute('aria-disabled', 'true');
    });
    it('disables non-supported options when saml-linked', async () => {
        renderComponent({...baseField, attrs: {...baseField.attrs, saml: 'samlPropName'}});
        await userEvent.click(screen.getByText('Text'));
        expect(screen.getByRole('menuitemradio', {name: 'Phone'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'URL'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Select'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Multi-select'})).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Select'})).toHaveAttribute('aria-disabled', 'true');
    });
    it('shows check icon for current type', async () => {
        const selectField = {
            ...baseField,
            type: 'select' as const,
            attrs: {
                ...baseField.attrs,
                value_type: '' as const,
            },
        };
        renderComponent(selectField);
        await userEvent.click(screen.getByText('Select'));
        expect(screen.getByRole('menuitemradio', {name: 'Select'})).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('menuitemradio', {name: 'Text'})).toHaveAttribute('aria-checked', 'false');
    });
});