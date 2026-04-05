import * as TIMEOUTS from '../../../../fixtures/timeouts';
describe('Profile Settings', () => {
    beforeEach(() => {
        cy.apiAdminLogin().apiInitSetup({loginAfter: true}).its('user').as('user');
    });
    it('MM-T2079 Can remove profile pic then choose different pic without saving in between', function() {
        setInitialPicture(this.user);
        cy.visit('/');
        getProfilePictureId().as('idOld');
        cy.uiOpenProfileModal('Profile Settings').findByRole('button', {name: /picture edit/i}).click();
        cy.findByRole('button', {name: /remove profile picture/i}).click();
        cy.findByTestId('uploadPicture').attachFile('png-image-file.png');
        cy.uiSave().wait(TIMEOUTS.HALF_SEC);
        cy.findByRole('button', {name: /close/i}).click();
        getProfilePictureId().then((idNew) => expect(idNew).to.exist.and.not.to.be.equal(this.idOld));
    });
    it('MM-T2075_1 Profile Picture: Cancel out of adding profile picture', () => {
        verifyProfilePictureDoesNotUpdateAfterCancel();
    });
    it('MM-T2075_2 Profile Picture: Cancel out of changing profile picture ', function() {
        setInitialPicture(this.user);
        verifyProfilePictureDoesNotUpdateAfterCancel();
    });
});
function getProfilePictureId() {
    return cy.uiGetProfileHeader().find('.Avatar').invoke('attr', 'src').then((urlString) => {
        const url = new URL(urlString);
        const params = new URLSearchParams(url.search);
        return params.get('_');
    });
}
function setInitialPicture(user) {
    cy.apiUploadFile('image', 'mattermost-icon.png', {
        url: `/api/v4/users/${user.id}/image`,
        method: 'POST',
        successStatus: 200,
    });
}
function verifyProfilePictureDoesNotUpdateAfterCancel() {
    let idOld;
    cy.visit('/');
    getProfilePictureId().then((id) => {
        idOld = id;
    });
    cy.uiOpenProfileModal('Profile Settings').findByRole('button', {name: /picture edit/i}).click();
    cy.findByTestId('uploadPicture').attachFile('png-image-file.png');
    cy.uiCancel().wait(TIMEOUTS.HALF_SEC);
    cy.uiClose();
    getProfilePictureId().then((idNew) => expect(idNew).to.equal(idOld));
}