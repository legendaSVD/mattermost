import timeouts from '../../../fixtures/timeouts';
import {getRandomId, stubClipboard} from '../../../utils';
describe('Connected Workspaces', () => {
    let testTeam: Cypress.Team;
    let testTeam2: Cypress.Team;
    let testUser: Cypress.UserProfile;
    let admin: Cypress.UserProfile;
    let testChannel: Cypress.Channel;
    before(() => {
        cy.apiGetMe().then(({user: adminUser}) => {
            admin = adminUser;
            cy.apiCreateTeam('testing-team-2', 'Testing Team 2').then(({team}) => {
                testTeam2 = team;
            });
            cy.apiInitSetup().then(({team, user, channel}) => {
                testTeam = team;
                testUser = user;
                testChannel = channel;
            });
        });
    });
    it('configured', () => {
        cy.apiRequireLicenseForFeature('SharedChannels');
        cy.apiGetConfig().then(({config: {ConnectedWorkspacesSettings}}) => {
            expect(ConnectedWorkspacesSettings.EnableSharedChannels).equal(true);
            expect(ConnectedWorkspacesSettings.EnableRemoteClusterService).equal(true);
        });
    });
    it('empty state', () => {
        cy.visit('/admin_console');
        cy.get("a[id='site_config/secure_connections']").click();
        cy.findByTestId('secureConnectionsSection').within(() => {
            cy.findByRole('heading', {name: 'Connected Workspaces'});
            cy.findByRole('heading', {name: 'Share channels'});
            cy.contains('Connecting with an external workspace allows you to share channels with them');
        });
    });
    describe('accept invitation lifecycle', () => {
        const orgDisplayName = 'Testing Org Name ' + getRandomId();
        before(() => {
            cy.visit('/admin_console/site_config/secure_connections');
        });
        it('accept - bad codes', () => {
            cy.findAllByRole('button', {name: 'Add a connection'}).eq(1).click();
            cy.findAllByRole('menuitem', {name: 'Accept an invitation'}).click();
            cy.findByRole('dialog', {name: 'Accept a connection invite'}).as('dialog');
            cy.get('@dialog').within(() => {
                cy.uiGetHeading('Accept a connection invite');
                cy.findByText('Accept a secure connection from another server');
                cy.findByText('Enter the encrypted invitation code shared to you by the admin of the server you are connecting with.');
                cy.uiGetButton('Accept').should('be.disabled');
                cy.findByRole('textbox', {name: 'Organization name'}).type(orgDisplayName);
                cy.findByRole('textbox', {name: 'Encrypted invitation code'}).type('abc123');
                cy.findByRole('textbox', {name: 'Password'}).type('123abc');
                cy.uiGetButton('Accept').should('be.disabled');
                cy.findByTestId('destination-team-input').click().
                    findByRole('textbox').type(`${testTeam2.display_name}{enter}`);
                cy.uiGetButton('Accept').click();
                cy.findByText('There was an error while accepting the invite.');
                cy.uiGetButton('Cancel').click();
            });
            cy.get('@dialog').should('not.exist');
        });
    });
    describe('create new connection lifecycle', () => {
        const orgDisplayName = 'Testing Org Name ' + getRandomId();
        const orgDisplayName2 = 'new display name here ' + getRandomId();
        before(() => {
            cy.visit('/admin_console/site_config/secure_connections');
        });
        it('create', () => {
            cy.findAllByRole('button', {name: 'Add a connection'}).first().click();
            cy.findAllByRole('menuitem', {name: 'Create a connection'}).click();
            cy.location('pathname').should('include', '/secure_connections/create');
            cy.findByTestId('organization-name-input').
                should('be.focused').
                type(orgDisplayName);
            cy.findByTestId('destination-team-input').click().
                findByRole('textbox').type(`${testTeam.display_name}{enter}`);
            cy.uiGetButton('Save').click();
            cy.location('pathname').should('not.include', '/secure_connections/create');
        });
        it('created dialog', () => {
            verifyInviteDialog('Connection created');
        });
        it('basic details', () => {
            cy.findByTestId('organization-name-input').
                should('not.be.focused').
                should('have.value', orgDisplayName);
            cy.findByTestId('destination-team-input').should('have.text', testTeam.display_name);
            cy.findByText('Connection Pending');
        });
        it('shared channels - empty', () => {
            cy.findByTestId('shared_channels_section').within(() => {
                cy.findByRole('heading', {name: "You haven't shared any channels"});
                cy.findByText('Please add channels to start sharing');
            });
        });
        it('add channel', () => {
            cy.findByTestId('shared_channels_section').within(() => {
                cy.findByRole('heading', {name: 'Shared Channels'});
                cy.findByText("A list of all the channels shared with your organization and channels you're sharing externally.");
                cy.uiGetButton('Add channels').click();
            });
            cy.findByRole('dialog', {name: 'Select channels'}).as('dialog');
            cy.get('@dialog').within(() => {
                cy.findByText('Please select a team and channels to share');
                cy.findByRole('textbox', {name: 'Search and add channels'}).
                    should('be.focused').
                    type(testChannel.display_name, {force: true}).
                    wait(timeouts.HALF_SEC).
                    type('{enter}');
                cy.uiGetButton('Share').click();
                cy.get('@dialog').should('not.exist');
            });
        });
        it('shared channels', () => {
            cy.findByTestId('shared_channels_section').within(() => {
                cy.findByRole('tab', {name: orgDisplayName});
                cy.findByRole('tab', {name: 'Your channels', selected: true});
                cy.findByRole('table').findAllByRole('row').as('rows');
                cy.get('@rows').first().within(() => {
                    cy.findByRole('columnheader', {name: 'Name'});
                    cy.findByRole('columnheader', {name: 'Current Team'});
                });
                cy.get('@rows').eq(1).as('sharedChannelRow').within(() => {
                    cy.findByRole('cell', {name: testChannel.display_name});
                    cy.findByRole('cell', {name: testTeam.display_name});
                });
            });
        });
        it('remove channel', () => {
            cy.findByRole('table').findAllByRole('row').eq(1).findByRole('button', {name: 'Remove'}).click();
            cy.findByRole('dialog', {name: 'Remove channel'}).as('dialog');
            cy.get('@dialog').within(() => {
                cy.uiGetHeading('Remove channel');
                cy.findByText('The channel will be removed from this connection and will no longer be shared with it.');
                cy.uiGetButton('Remove').click();
            });
            cy.uiGetHeading("You haven't shared any channels");
        });
        it('change display name and destination team', () => {
            cy.uiGetButton('Save').should('be.disabled');
            cy.findByTestId('organization-name-input').
                focus().
                clear().
                type(orgDisplayName2);
            cy.findByTestId('destination-team-input').click().
                findByRole('textbox').type(`${testTeam2.display_name}{enter}`);
            cy.uiGetButton('Save').click();
            cy.findByTestId('organization-name-input').
                should('have.value', orgDisplayName2);
            cy.findByTestId('destination-team-input').should('have.text', testTeam2.display_name);
            cy.wait(timeouts.ONE_SEC);
        });
        it('can go back', () => {
            cy.get('a.back').click();
            cy.findByRole('heading', {name: 'Connected Workspaces'});
        });
        it('connection row - basics', () => {
            cy.findAllByRole('link', {name: orgDisplayName2}).as('row');
            cy.get('@row').click();
            cy.get('a.back').click();
            cy.get('@row').findByText('Connection Pending');
            cy.get('@row').findByRole('button', {name: `Connection options for ${orgDisplayName2}`}).click();
            cy.findByRole('menu').findByRole('menuitem', {name: 'Edit'}).click();
            cy.get('a.back').click();
        });
        it('connection row - generate invitation', () => {
            cy.findAllByRole('link', {name: orgDisplayName2}).as('row');
            cy.get('@row').findByRole('button', {name: `Connection options for ${orgDisplayName2}`}).click();
            cy.findByRole('menu').findByRole('menuitem', {name: 'Generate invitation code'}).click();
            verifyInviteDialog('Invitation code');
        });
        it('connection row - delete connection', () => {
            cy.findAllByRole('link', {name: orgDisplayName2}).as('row');
            cy.get('@row').findByRole('button', {name: `Connection options for ${orgDisplayName2}`}).click();
            cy.findByRole('menu').findByRole('menuitem', {name: 'Delete'}).click();
            cy.findByRole('dialog', {name: 'Delete secure connection'}).as('dialog');
            cy.get('@dialog').within(() => {
                cy.uiGetHeading('Delete secure connection');
                cy.uiGetButton('Yes, delete').click();
            });
            cy.get('@row').should('not.exist');
            cy.get('@dialog').should('not.exist');
        });
    });
});
const verifyInviteDialog = (name: string) => {
    stubClipboard().as('clipboard');
    cy.findByRole('dialog', {name}).as('dialog').within(() => {
        cy.uiGetHeading(name);
        cy.findByText('Please share the invitation code and password with the administrator of the server you want to connect with.');
        cy.findByText('Share these two separately to avoid a security compromise');
        cy.findByText('Share this code and password');
        cy.findByRole('group', {name: 'Encrypted invitation code'}).as('invite');
        cy.findByRole('group', {name: 'Password'}).as('password');
        cy.get('@invite').
            findByRole('button', {name: 'Copy'}).
            click().
            should('have.text', 'Copied');
        cy.get('@invite').
            findByRole('textbox').invoke('val').
            then((value) => {
                cy.get('@clipboard').
                    its('contents').
                    should('contain', value);
            });
        cy.get('@password').
            findByRole('button', {name: 'Copy'}).
            click().
            should('have.text', 'Copied');
        cy.get('@password').
            findByRole('textbox').invoke('val').
            then((value) => {
                cy.get('@clipboard').
                    its('contents').
                    should('contain', value);
            });
        cy.uiGetButton('Done').click();
    });
    cy.get('@dialog').should('not.exist');
};