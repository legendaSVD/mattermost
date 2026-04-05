function getLines(e) {
    const $cont = Cypress.$(e);
    const textArr = $cont.text().split(' ');
    for (let i = 0; i < textArr.length; i++) {
        textArr[i] = '<span>' + textArr[i] + ' </span>';
    }
    $cont.html(textArr.join(''));
    const $wordSpans = $cont.find('span');
    const lineArray = [];
    let lineIndex = 0;
    let lineStart = true;
    $wordSpans.each(function handleWord(idx) {
        const top = Cypress.$(this).position().top;
        if (lineStart) {
            lineArray[lineIndex] = [idx];
            lineStart = false;
        } else {
            const $next = Cypress.$(this).next();
            if ($next.length) {
                if ($next.position().top > top) {
                    lineArray[lineIndex].push(idx);
                    lineIndex++;
                    lineStart = true;
                }
            } else {
                lineArray[lineIndex].push(idx);
            }
        }
    });
    return lineArray.length;
}
describe('System Message', () => {
    let testUsername;
    before(() => {
        cy.apiInitSetup({loginAfter: true}).then(({team, user}) => {
            testUsername = user.username;
            cy.visit(`/${team.name}/channels/off-topic`);
        });
    });
    it('MM-T426 System messages wrap properly', () => {
        const newHeader = `${Date.now()} newheader`;
        cy.updateChannelHeader(`> ${newHeader}`);
        cy.getLastPost().
            should('contain', 'System').
            and('contain', `@${testUsername} updated the channel header to:`).
            and('contain', newHeader);
        const validateSingle = (desc) => {
            const lines = getLines(desc.find('p').last());
            assert(lines === 1, 'second line of the message should be a short one');
        };
        cy.getLastPost().then(validateSingle);
        cy.updateChannelHeader('> ' + newHeader.repeat(20));
        cy.getLastPost().
            should('contain', 'System').
            and('contain', `@${testUsername} updated the channel header`).
            and('contain', 'From:').
            and('contain', newHeader).
            and('contain', 'To:').
            and('contain', newHeader.repeat(20));
        const validateMulti = (desc) => {
            const lines = getLines(desc.find('p').last());
            assert(lines > 1, 'second line of the message should be a long one');
        };
        cy.getLastPost().then(validateMulti);
    });
});