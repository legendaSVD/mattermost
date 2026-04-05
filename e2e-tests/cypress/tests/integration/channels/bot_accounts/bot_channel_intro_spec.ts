import {Bot} from '@mattermost/types/bots';
import {Team} from '@mattermost/types/teams';
import {createBotPatch} from '../../../support/api/bots';
describe('Bot channel intro and avatar', () => {
    let team: Team;
    let bot: Bot;
    before(() => {
        cy.apiInitSetup().then((out) => {
            team = out.team;
        });
        cy.makeClient().then(async (client) => {
            bot = await client.createBot(createBotPatch());
            await client.addToTeam(team.id, bot.user_id);
        });
    });
    it('MM-T1839 Bots have default profile image visible', () => {
        cy.visit(`/${team.name}/messages/@${bot.username}`);
        cy.get<HTMLImageElement[]>(`#channelIntro .profile-icon > img.Avatar, img.Avatar[alt="${bot.username} profile image"]`).
            should(($imgs) => {
                expect($imgs[0].naturalWidth).to.be.greaterThan(0);
                expect($imgs[1].naturalWidth).to.be.greaterThan(0);
            }).
            each(($img) => {
                cy.wrap($img).
                    should('be.visible').
                    and('have.attr', 'src').
                    then((url) => cy.request({url, encoding: 'binary'} as unknown as Partial<Cypress.RequestOptions>)).
                    then(({body}) => {
                        cy.fixture('bot-default-avatar.png', 'binary').should('deep.equal', body);
                    });
            });
    });
});