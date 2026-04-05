import * as TIMEOUTS from '../../../../fixtures/timeouts';
import {getRandomId} from '../../../../utils';
import {verifyEphemeralMessage} from './helper';
describe('Integrations', () => {
    let testUser;
    let otherUser;
    let offTopicUrl;
    let channelUrl;
    before(() => {
        cy.apiInitSetup().then((out) => {
            testUser = out.user;
            offTopicUrl = out.offTopicUrl;
            channelUrl = out.channelUrl;
            cy.apiCreateUser({prefix: 'other'}).then(({user}) => {
                otherUser = user;
                cy.apiAddUserToTeam(out.team.id, otherUser.id).then(() => {
                    cy.apiAddUserToChannel(out.channel.id, otherUser.id);
                });
            });
            cy.apiLogin(testUser);
        });
    });
    beforeEach(() => {
        cy.visit(channelUrl);
        cy.postMessage('hello');
    });
    it('MM-T573 / autocomplete list can scroll', () => {
        cy.uiGetPostTextBox().clear().type('/');
        cy.get('#suggestionList', {timeout: TIMEOUTS.FIVE_SEC}).should('be.visible').scrollTo('bottom').then((container) => {
            cy.contains('/away', {container}).should('not.be.visible');
            cy.contains('/shrug [message]', {container}).should('be.visible');
        });
        cy.get('#suggestionList').scrollTo('top').then((container) => {
            cy.contains('/away', {container}).should('be.visible');
            cy.contains('/shrug [message]', {container}).should('not.be.visible');
        });
    });
    it('MM-T678 /code', () => {
        const message = '1. Not a list item, **not bolded**, http://notalink.com, ~off-topic is not a link to the channel.';
        cy.postMessage(`/code ${message} `);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').should('have.text', testUser.username);
            cy.get(`#postMessageText_${postId}`).get('code').should('contain', message);
        });
        cy.postMessage('/code ');
        verifyEphemeralMessage('A message must be provided with the /code command.');
    });
    it('MM-T679 /echo', () => {
        const message = getRandomId();
        cy.uiGetPostTextBox().clear().type(`/echo ${message} 3{enter}`);
        cy.getLastPost().within(() => {
            cy.findByText(message).should('not.exist');
        });
        cy.wait(TIMEOUTS.TWO_SEC);
        cy.getLastPost().within(() => {
            cy.findByText(testUser.username);
            cy.findByText(message);
        });
    });
    it('MM-T680 /help', () => {
        cy.postMessage('/help ');
        cy.wait(TIMEOUTS.HALF_SEC).getLastPostId().then((botLastPostId) => {
            cy.get(`#post_${botLastPostId}`).within(() => {
                cy.findByText('(Only visible to you)').should('exist');
                cy.contains('Mattermost is an open source platform for secure communication').should('exist');
            });
        });
    });
    it('MM-T681 /invite_people error message with no text or text that is not an email address', () => {
        cy.postMessage('/invite_people 123');
        verifyEphemeralMessage('Please specify one or more valid email addresses');
    });
    it('MM-T682 /leave', () => {
        cy.visit(offTopicUrl);
        cy.postMessage('/leave ');
        cy.get('#sidebar-left').should('be.visible').should('not.contain', 'Off-Topic');
        cy.uiGetLhsSection('CHANNELS').find('.active').should('contain', 'Town Square');
        cy.get('#channelHeaderTitle').should('be.visible').should('contain', 'Town Square');
    });
    it('MM-T574 /shrug test', () => {
        cy.getCurrentChannelId().then((channelId) => {
            cy.postMessageAs({sender: otherUser, message: 'hello from otherUser', channelId});
        });
        const message = getRandomId();
        cy.postMessage(`/shrug ${message} `);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').should('have.text', testUser.username);
            cy.get(`#postMessageText_${postId}`).should('have.text', `${message} ¯\\_(ツ)_/¯`);
        });
        cy.apiLogin(otherUser);
        cy.visit(channelUrl);
        cy.getLastPostId().then((postId) => {
            cy.get(`#post_${postId}`).find('.user-popover').should('have.text', testUser.username);
            cy.get(`#postMessageText_${postId}`).should('have.text', `${message} ¯\\_(ツ)_/¯`);
        });
    });
    it('MM-T5100 /marketplace test', () => {
        cy.apiAdminLogin();
        cy.apiInitSetup().then(({team}) => {
            cy.visit(`/${team.name}/channels/town-square`);
            cy.postMessage('/marketplace ');
            cy.findByRole('heading', {name: 'App Marketplace'}).should('be.visible');
        });
    });
});