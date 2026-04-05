import {getRandomLetter} from '../../../../utils';
import {doTestQuickChannelSwitcher} from '../../autocomplete/common_test';
import {createSearchData, SimpleUser} from '../../autocomplete/helpers';
import {enableElasticSearch} from './helpers';
describe('Autocomplete with Elasticsearch - Users', () => {
    const prefix = getRandomLetter(3);
    let testUsers: Record<string, SimpleUser>;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiRequireLicenseForFeature('Elasticsearch');
        enableElasticSearch();
        createSearchData(prefix).then((searchData) => {
            testUsers = searchData.users;
            cy.apiLogin(searchData.sysadmin);
            cy.visit(`/${searchData.team.name}/channels/town-square`);
            cy.typeCmdOrCtrl().type('k');
            cy.findByRole('combobox', {name: 'quick switch input'}).should('be.visible');
        });
    });
    describe('search for user in channel switcher', () => {
        describe('by @username', () => {
            it('MM-T2506_1 Full username returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}ironman`, testUsers.ironman);
            });
            it('MM-T2506_2 Unique partial username returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}doc`, testUsers.doctorstrange);
            });
            it('MM-T2506_3 Partial username returns all users that match', () => {
                doTestQuickChannelSwitcher(`@${prefix}i`, testUsers.ironman);
            });
        });
        describe('by @firstname', () => {
            it('MM-T3860_1 Full first name returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}tony`, testUsers.ironman);
            });
            it('MM-T3860_2 Unique partial first name returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}wa`, testUsers.deadpool);
            });
            it('MM-T3860_3 Partial first name returns all users that match', () => {
                doTestQuickChannelSwitcher(`@${prefix}ste`, testUsers.captainamerica, testUsers.doctorstrange);
            });
        });
        describe('by @lastname', () => {
            it('MM-T3861_1 Full last name returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}stark`, testUsers.ironman);
            });
            it('MM-T3861_2 Unique partial last name returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}ban`, testUsers.hulk);
            });
            it('MM-T3861_3 Partial last name returns all users that match', () => {
                doTestQuickChannelSwitcher(`@${prefix}ba`, testUsers.hawkeye, testUsers.hulk);
            });
        });
        describe('by @nickname', () => {
            it('MM-T3862_1 Full nickname returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}ronin`, testUsers.hawkeye);
            });
            it('MM-T3862_2 Unique partial nickname returns single user', () => {
                doTestQuickChannelSwitcher(`@${prefix}gam`, testUsers.hulk);
            });
            it('MM-T3862_3 Partial nickname returns all users that match', () => {
                doTestQuickChannelSwitcher(`@${prefix}pro`, testUsers.captainamerica, testUsers.ironman);
            });
        });
        describe('special characters in usernames are returned', () => {
            it('MM-T3856_1 Username with dot', () => {
                doTestQuickChannelSwitcher(`@${prefix}dot.dot`, testUsers.dot);
            });
            it('MM-T3856_2 Username dash', () => {
                doTestQuickChannelSwitcher(`@${prefix}dash-dash`, testUsers.dash);
            });
            it('MM-T3856_3 Username underscore', () => {
                doTestQuickChannelSwitcher(`@${prefix}under_score`, testUsers.underscore);
            });
        });
    });
});