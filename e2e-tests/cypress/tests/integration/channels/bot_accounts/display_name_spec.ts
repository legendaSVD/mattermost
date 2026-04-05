import {Bot} from '@mattermost/types/bots';
import {Channel} from '@mattermost/types/channels';
import {UserProfile} from '@mattermost/types/users';
describe('Bot display name', () => {
    let offTopicChannel: Channel;
    let otherSysadmin: UserProfile;
    before(() => {
        cy.intercept('**/api/v4