import {demoPlugin} from '../../../utils/plugins';
describe('Messaging', () => {
    let testTeam;
    let testChannel;
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.shouldHavePluginUploadEnabled();
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableGifPicker: true,
            },
            FileSettings: {
                EnablePublicLink: true,
            },
        });
        cy.apiInitSetup().then(({team, user, offTopicUrl}) => {
            testTeam = team;
            cy.apiUploadAndEnablePlugin(demoPlugin);
            cy.apiLogin(user);
            cy.apiCreateChannel(testTeam.id, 'channel-test', 'Public channel with a long name').then(({channel}) => {
                testChannel = channel;
            });
            cy.visit(offTopicUrl);
        });
    });
    it('MM-T134 Visual verification of tooltips on top nav, channel icons, posts', () => {
        cy.findByRole('banner', {name: 'channel header region'}).should('be.visible').as('channelHeader');
        openAndVerifyTooltip(() => cy.uiGetChannelMemberButton(), 'Members');
        openAndVerifyTooltip(() => cy.uiGetChannelPinButton(), 'Pinned messages');
        openAndVerifyTooltip(() => cy.uiGetSavedPostButton(), 'Saved messages');
        openAndVerifyTooltip(() => cy.uiGetChannelFavoriteButton(), 'Add to Favorites');
        cy.get('@channelHeader').findByRole('button', {name: 'add to favorites'}).should('be.visible').click();
        openAndVerifyTooltip(() => cy.uiGetChannelFavoriteButton(), 'Remove from Favorites');
        cy.uiOpenChannelMenu('Mute Channel');
        openAndVerifyTooltip(() => cy.uiGetMuteButton(), 'Unmute');
        cy.findByLabelText('Upload files').attachFile('long_text_post.txt');
        cy.postMessage('test file upload');
        const downloadLink = () => cy.findByTestId('fileAttachmentList').should('be.visible').findByRole('link', {name: 'download', hidden: true});
        downloadLink().trigger('mouseover');
        cy.uiGetToolTip('Download');
        downloadLink().trigger('mouseout');
        cy.get(`#sidebarItem_${testChannel.name}`).should('be.visible').as('longChannelAtSidebar');
        cy.get('@longChannelAtSidebar').trigger('mouseover');
        cy.uiGetToolTip(testChannel.display_name);
        cy.get('@longChannelAtSidebar').trigger('mouseout');
        cy.get('[role=button] .fa-plug').should('be.visible').trigger('mouseover');
        cy.uiGetToolTip('Demo Plugin');
    });
});
function openAndVerifyTooltip(buttonFn, text) {
    buttonFn().trigger('mouseover');
    cy.uiGetToolTip(text);
    buttonFn().trigger('mouseout');
}