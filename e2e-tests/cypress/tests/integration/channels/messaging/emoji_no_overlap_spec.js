describe('Messaging', () => {
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({townSquareUrl}) => {
            cy.visit(townSquareUrl);
        });
    });
    it("MM-T165 Windows: Custom emoji don't overlap", () => {
        const emojis = '😈🤣👘😘😋😋😛🤨😎😏😛🤓😋😖🤨😫😫😚😒😋☹️🤨😒😒🤪😖😋😒😋🤨😏😩🤨😀🤨😇🧐🙃🤨🙃😟😛😔🧐☹️🤬😱😳🤫🤫😥😳🤔😨🤗😢😑🤢🤢🤢🤮🤮😪😑😑🤔😴🤭😵😑😷🤐🤐👙👨‍👧‍👧👨‍👨‍👧‍👦👚👩‍👦‍👦👔👩‍👧‍👦👠👩‍👦‍👦👨‍👦‍👦';
        cy.postMessage(emojis);
        cy.get('.emoticon').then((allEmoticons) => {
            for (let index = 0; index < allEmoticons.length - 1; index++) {
                const emoticon = allEmoticons[index];
                const emoticonToCompare = allEmoticons[index + 1];
                if (emoticon.getBoundingClientRect().top === emoticonToCompare.getBoundingClientRect().top) {
                    cy.wrap(emoticon.getBoundingClientRect().right).should('be.lte', emoticonToCompare.getBoundingClientRect().left);
                }
            }
        });
    });
});