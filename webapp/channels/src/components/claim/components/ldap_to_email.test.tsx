import React from 'react';
import {renderWithContext, screen, userEvent, waitFor} from 'tests/react_testing_utils';
import {ClaimErrors} from 'utils/constants';
import LDAPToEmail from './ldap_to_email';
describe('components/claim/components/ldap_to_email.jsx', () => {
    const requiredProps = {
        email: '',
        passwordConfig: {
            minimumLength: 5,
            requireLowercase: true,
            requireUppercase: true,
            requireNumber: true,
            requireSymbol: true,
        },
        switchLdapToEmail: jest.fn(() => Promise.resolve({data: {follow_link: '/login'}})),
    };
    beforeEach(() => {
        requiredProps.switchLdapToEmail.mockClear();
    });
    test('submit via MFA should call switchLdapToEmail with empty passwords', async () => {
        const token = 'abcd1234';
        renderWithContext(<LDAPToEmail {...requiredProps}/>);
        const tokenInput = screen.getByLabelText('MFA Token');
        await userEvent.type(tokenInput, token);
        await userEvent.click(screen.getByRole('button', {name: 'Submit'}));
        expect(requiredProps.switchLdapToEmail).toHaveBeenCalledTimes(1);
        expect(requiredProps.switchLdapToEmail).
            toHaveBeenCalledWith('', requiredProps.email, '', token);
    });
    test('full flow: password form then MFA should call switchLdapToEmail with passwords and token', async () => {
        const ldapPasswordValue = 'ldapPsw';
        const passwordValue = 'Abc1!xyz';
        const token = 'abcd1234';
        const switchLdapToEmail = jest.fn().
            mockResolvedValueOnce({error: {server_error_id: 'some.generic.error', message: 'Error'}}).
            mockResolvedValueOnce({error: {server_error_id: ClaimErrors.MFA_VALIDATE_TOKEN_AUTHENTICATE, message: 'MFA required'}}).
            mockResolvedValueOnce({data: {follow_link: '/login'}});
        const props = {
            ...requiredProps,
            email: 'test@example.com',
            switchLdapToEmail,
        };
        renderWithContext(<LDAPToEmail {...props}/>);
        const mfaInput = screen.getByLabelText('MFA Token');
        await userEvent.type(mfaInput, 'dummy');
        await userEvent.click(screen.getByRole('button', {name: 'Submit'}));
        await waitFor(() => {
            expect(screen.getByPlaceholderText('AD/LDAP Password')).toBeInTheDocument();
        });
        await userEvent.type(screen.getByPlaceholderText('AD/LDAP Password'), ldapPasswordValue);
        await userEvent.type(screen.getByPlaceholderText('Password'), passwordValue);
        await userEvent.type(screen.getByPlaceholderText('Confirm Password'), passwordValue);
        await userEvent.click(screen.getByRole('button', {name: 'Switch account to email/password'}));
        expect(switchLdapToEmail).toHaveBeenNthCalledWith(2, ldapPasswordValue, 'test@example.com', passwordValue, '');
        await waitFor(() => {
            expect(screen.getByLabelText('MFA Token')).toBeInTheDocument();
        });
        await userEvent.type(screen.getByLabelText('MFA Token'), token);
        await userEvent.click(screen.getByRole('button', {name: 'Submit'}));
        expect(switchLdapToEmail).toHaveBeenNthCalledWith(3, ldapPasswordValue, 'test@example.com', passwordValue, token);
    });
});