import {Team} from '@mattermost/types/teams';
import {getRandomId} from '../../../utils';
import {createBotInteractive} from './helpers';
describe('Bot accounts - CRUD Testing', () => {
    let newTeam: Team;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        const newSettings = {
            EmailSettings: {
                SMTPServer: '',
            },
            PluginSettings: {
                Enable: true,
            },
        };
        cy.apiUpdateConfig(newSettings);
        cy.apiCreateBot();
        cy.apiInitSetup().then(({team}) => {
            newTeam = team;
            cy.visit(`/${newTeam.name}/integrations/bots`);
        });
    });
    it('MM-T1849 Create a Personal Access Token when email config is invalid', () => {
        const botUsername = `bot-${getRandomId()}`;
        createBotInteractive(newTeam, botUsername);
        cy.get('#doneButton').click();
        cy.findByText(`Test Bot (@${botUsername})`).then((el) => {
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findByText('Create New Token').should('be.visible').click();
            cy.wrap(el[0].parentElement.parentElement).find('input').click().type('description!');
            cy.findByTestId('saveSetting').click();
            cy.wrap(el[0].parentElement.parentElement).findByText('Close').should('be.visible').click();
            cy.wrap(el[0].parentElement.parentElement).scrollIntoView();
            cy.wrap(el[0].parentElement.parentElement).findAllByText(/Token ID:/).should('have.length', 2);
        });
    });
});