describe('Profile Settings', () => {
    let testUser;
    before(() => {
        cy.apiInitSetup({prefix: 'other', loginAfter: true}).then(({offTopicUrl, user}) => {
            cy.visit(offTopicUrl);
            testUser = user;
        });
    });
    it('MM-T2044 Clear fields, values revert', () => {
        cy.uiOpenProfileModal('Profile Settings');
        cy.get('#nameEdit').should('be.visible').click();
        cy.get('#firstName').clear();
        cy.get('#firstName').should('be.visible').type('newFirstName');
        cy.get('#lastName').should('be.visible').clear();
        cy.get('#lastName').should('be.visible').type('newLastName');
        cy.uiCancel();
        cy.get('#nameDesc').should('be.visible').should('contain', testUser.first_name + ' ' + testUser.last_name);
        cy.uiClose();
    });
    const fileTypes = [
        {
            extension: 'PNG',
            fileName: 'profile_picture.png',
        },
        {
            extension: 'JPG',
            fileName: 'profile_picture.jpg',
        },
        {
            extension: 'JPEG',
            fileName: 'profile_picture.jpeg',
        },
        {
            extension: 'BMP',
            fileName: 'profile_picture.bmp',
        },
    ];
    fileTypes.forEach((fileType, index) => {
        it(`MM-T2078_${index + 1} Profile picture: file ${fileType.extension} type accepted`, () => {
            cy.uiGetSetStatusButton().get('img').invoke('attr', 'src').as('defaultProfilePictureLink');
            cy.uiOpenProfileModal('Profile Settings');
            cy.get('#pictureEdit').should('be.visible').click();
            cy.findByTestId('saveSettingPicture').should('have.class', 'disabled');
            cy.findByTestId('uploadPicture').attachFile(fileType.fileName);
            cy.findByTestId('saveSettingPicture').should('not.have.class', 'disabled').click();
            cy.get('#pictureDesc').should('include.text', 'Image last updated');
            cy.get('#pictureEdit').should('be.visible');
            cy.uiClose();
            cy.uiGetSetStatusButton().get('img').invoke('attr', 'src').as('customProfilePictureLink');
            cy.then(function() {
                expect(this.customProfilePictureLink).to.not.equal(this.defaultProfilePictureLink);
                expect(this.customProfilePictureLink, 'New custom profile picture link should end with "?image_=<digits>"').to.match(/image\?_=\d+$/);
            });
        });
    });
});