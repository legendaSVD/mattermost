describe('Scroll', () => {
    let testTeam;
    beforeEach(() => {
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);
        });
    });
    it('MM-T2369 Aspect Ratio is preserved in RHS', () => {
        const uploadedImages = [
            {
                alt: 'Wide image',
                width: 960,
                height: 246,
                src:
                    'https://cdn.pixabay.com/photo/2017/10/10/22/24/wide-format-2839089_960_720.jpg',
            },
            {
                alt: 'Tall image',
                width: 400,
                height: 950,
                src:
                    'https://media.npr.org/programs/atc/features/2009/may/short/abetall3-0483922b5fb40887fc9fbe20a606e256cbbd10ee-s800-c85.jpg',
            },
        ];
        uploadedImages.forEach((uploadedImage) => {
            cy.uiPostMessageQuickly(`![${uploadedImage.alt}](${uploadedImage.src})`);
            cy.getLastPost().within(() => {
                verifyImageAspectRatioCorrectness(uploadedImage);
            });
            cy.clickPostCommentIcon();
            cy.get('#rhsContainer').within(() => {
                verifyImageAspectRatioCorrectness(uploadedImage);
            });
        });
    });
});
function verifyImageAspectRatioCorrectness(originalImage) {
    cy.findByAltText(originalImage.alt).
        should('exist').
        and((img) => {
            expect(img.width() / img.height()).to.be.closeTo(
                originalImage.width / originalImage.height,
                0.02,
            );
        });
}