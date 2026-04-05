import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Keyboard Shortcuts', () => {
    let sysadmin;
    let dmWithSysadmin;
    let townSquare;
    let offTopic;
    let testTeam;
    let publicChannel;
    let privateChannel;
    before(() => {
        cy.apiGetMe().then(({user: adminUser}) => {
            sysadmin = adminUser;
            cy.apiInitSetup({loginAfter: true}).then(({team, channel, user}) => {
                testTeam = team;
                publicChannel = channel;
                cy.apiCreateChannel(testTeam.id, 'private-a', 'Private B', 'P').then((out) => {
                    privateChannel = out.channel;
                });
                cy.apiCreateDirectChannel([sysadmin.id, user.id]).then((out) => {
                    dmWithSysadmin = out.channel;
                    dmWithSysadmin.name = sysadmin.username;
                    dmWithSysadmin.display_name = sysadmin.username;
                });
                cy.apiGetChannelByName(testTeam.name, 'town-square').then((out) => {
                    townSquare = out.channel;
                });
                cy.apiGetChannelByName(testTeam.name, 'off-topic').then((out) => {
                    offTopic = out.channel;
                });
            });
        });
    });
    it('MM-T1229 Alt/Option + Up', () => {
        cy.visit(`/${testTeam.name}/messages/@${sysadmin.username}`);
        cy.get('#channelHeaderTitle').should('contain', sysadmin.username).wait(TIMEOUTS.ONE_SEC);
        verifyChannelSwitch(testTeam.name, townSquare, dmWithSysadmin, '{uparrow}');
        verifyChannelSwitch(testTeam.name, privateChannel, townSquare, '{uparrow}');
        verifyChannelSwitch(testTeam.name, offTopic, privateChannel, '{uparrow}');
        verifyChannelSwitch(testTeam.name, publicChannel, offTopic, '{uparrow}');
        verifyChannelSwitch(testTeam.name, dmWithSysadmin, publicChannel, '{uparrow}');
    });
    it('MM-T1230 Alt/Option + Down', () => {
        cy.visit(`/${testTeam.name}/channels/${publicChannel.name}`);
        cy.get('#channelHeaderTitle').should('contain', publicChannel.display_name).wait(TIMEOUTS.ONE_SEC);
        verifyChannelSwitch(testTeam.name, offTopic, publicChannel, '{downarrow}');
        verifyChannelSwitch(testTeam.name, privateChannel, offTopic, '{downarrow}');
        verifyChannelSwitch(testTeam.name, townSquare, privateChannel, '{downarrow}');
        verifyChannelSwitch(testTeam.name, dmWithSysadmin, townSquare, '{downarrow}');
    });
    function verifyChannelSwitch(teamName, toChannel, fromChannel, arrowKey) {
        cy.get('body').type(`{alt}${arrowKey}`);
        if (toChannel.type === 'D') {
            cy.url().should('include', `/${teamName}/messages/@${toChannel.name}`);
        } else {
            cy.url().should('include', `/${teamName}/channels/${toChannel.name}`);
        }
        cy.get('#SidebarContainer').should('be.visible').within(() => {
            verifyClass(toChannel, 'have.class');
            verifyClass(fromChannel, 'not.have.class');
        });
        function verifyClass(channel, assertion) {
            let label;
            if (channel.type === 'O') {
                label = channel.display_name.toLowerCase() + ' public channel';
            } else if (channel.type === 'P') {
                label = channel.display_name.toLowerCase() + ' private channel';
            } else if (channel.type === 'D') {
                label = channel.display_name.toLowerCase();
            }
            cy.findByLabelText(label).parent().should(assertion, 'active');
        }
    }
});