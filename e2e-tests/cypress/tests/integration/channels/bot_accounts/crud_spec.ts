import {Bot} from '@mattermost/types/bots';
import {Team} from '@mattermost/types/teams';
import {getRandomId} from '../../../utils';
import {createBotInteractive} from './helpers';
describe('Bot accounts - CRUD Testing', () => {
    let newTeam: Team;
    let testBot: Bot & {fullDisplayName: string};
    before(() => {
        cy.apiInitSetup().then(({team}) => {
            newTeam = team;
        });
        cy.apiAdminLogin();
    });
    beforeEach(() => {
        cy.apiCreateBot().then(({bot}) => {
            testBot = bot;
        });
    });
    it('MM-T1841 Long description text', () => {
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.findByText(testBot.fullDisplayName).then((el) => {
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText('Edit').should('be.visible').click();
            cy.url().should('include', `/${newTeam.name}/integrations/bots/edit`);
            const longDescription = 'A'.repeat(1020);
            cy.get('#description').clear().type(longDescription);
            cy.get('#description').should('have.value', longDescription);
            cy.get('#description').type('{end}12345');
            cy.get('#description').should('have.value', longDescription + '1234');
            cy.get('#saveBot').click();
            cy.url().should('include', `/${newTeam.name}/integrations/bots`);
            cy.findAllByText(longDescription + '1234').should('exist');
        });
    });
    it('MM-T1842 Change BOT role', () => {
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.findByText(testBot.fullDisplayName).then((el) => {
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText('Edit').should('be.visible').click();
            cy.url().should('include', `/${newTeam.name}/integrations/bots/edit`);
            cy.get('select').select('System Admin');
            cy.get('#postChannels').should('be.checked').should('be.disabled');
            cy.get('#postAll').should('be.checked').should('be.disabled');
            cy.get('#saveBot').click();
            cy.url().should('include', `/${newTeam.name}/integrations/bots`);
        });
    });
    it('MM-T1843 ID along with actual token is created', () => {
        createBotInteractive(newTeam);
        cy.get('#doneButton').click();
    });
    it('MM-T1844 Token is hidden when you return to the page but ID is still visible', () => {
        const botUsername = `bot-${getRandomId()}`;
        createBotInteractive(newTeam, botUsername).then((text) => {
            cy.get('#doneButton').click();
            cy.findByText(`Test Bot (@${botUsername})`).then((el) => {
                cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
                const token = text.substr(text.indexOf('Token: ') + 7, 26);
                cy.findByText(new RegExp(token)).should('not.exist');
            });
        });
    });
    it('MM-T1845 Create a new token via the UI', () => {
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.findByText(testBot.fullDisplayName).then((el) => {
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText('Create New Token').should('be.visible').click();
            cy.findByTestId('saveSetting').click();
            cy.wrap(el[0].parentElement.parentElement).find('input').scrollIntoView();
            cy.get('#clientError').should('be.visible');
            cy.wrap(el[0].parentElement.parentElement).find('input').click().type(testBot.username + 'description!');
            cy.findByTestId('saveSetting').click();
            cy.get('#clientError').should('not.exist');
            cy.findAllByText(testBot.username + 'description!').should('exist');
        });
    });
    it('MM-T1848 Delete Token', () => {
        cy.visit(`/${newTeam.name}/integrations/bots`);
        cy.findByText(testBot.fullDisplayName).then((el) => {
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText('Create New Token').should('be.visible').click();
            cy.wrap(el[0].parentElement.parentElement).find('input').click().type('description!');
            cy.findByTestId('saveSetting').click();
            cy.wrap(el[0].parentElement.parentElement).findByText('Close').should('be.visible').click();
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText(/Token ID:/).should('be.visible');
            cy.wrap(el[0].parentElement.parentElement).findByText('Delete').should('be.visible').click();
            cy.get('#confirmModalButton').should('be.visible').click();
            cy.wrap(el[0].parentElement.parentElement).findByText(/Token ID:/).should('not.exist');
        });
    });
});