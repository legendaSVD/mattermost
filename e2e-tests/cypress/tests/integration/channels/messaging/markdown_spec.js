import * as TIMEOUTS from '../../../fixtures/timeouts';
const testCases = [
    {name: 'Markdown - typescript', fileKey: 'markdown_typescript'},
    {name: 'Markdown - postgres', fileKey: 'markdown_postgres'},
    {name: 'Markdown - latex', fileKey: 'markdown_latex'},
    {name: 'Markdown - python', fileKey: 'markdown_python'},
    {name: 'Markdown - shell', fileKey: 'markdown_shell'},
];
describe('Markdown', () => {
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiUpdateConfig({
            ServiceSettings: {
                EnableLatex: true,
                EnableTesting: true,
            },
        });
        cy.apiInitSetup({loginAfter: true}).then(({offTopicUrl}) => {
            cy.visit(offTopicUrl);
            cy.postMessage('hello');
        });
    });
    testCases.forEach((testCase, i) => {
        it(`MM-T1734_${i + 1} Code highlighting - ${testCase.name}`, () => {
            cy.postMessageFromFile(`markdown/${testCase.fileKey}.md`).wait(TIMEOUTS.ONE_SEC);
            cy.compareLastPostHTMLContentFromFile(`markdown/${testCase.fileKey}.html`);
        });
    });
    it('MM-T2241 Markdown basics', () => {
        postMarkdownTest('/test url test-markdown-basics.md');
        let postId;
        let expectedHtml;
        cy.getNthPostId(-2).then((id) => {
            postId = id;
            return cy.fixture('markdown/markdown_test_basic.html', 'utf-8');
        }).then((html) => {
            expectedHtml = html;
            const postMessageTextId = `#postMessageText_${postId}`;
            return cy.get(postMessageTextId).invoke('html');
        }).then((res) => {
            assert(res === expectedHtml.replace(/\n$/, ''));
        });
    });
    it('MM-T2242 Markdown lists', () => {
        postMarkdownTest('/test url test-markdown-lists.md');
        let postId;
        let expectedHtml;
        cy.getNthPostId(-2).then((id) => {
            postId = id;
            return cy.fixture('markdown/markdown_list.html', 'utf-8');
        }).then((html) => {
            expectedHtml = html;
            const postMessageTextId = `#postMessageText_${postId}`;
            return cy.get(postMessageTextId).invoke('html');
        }).then((res) => {
            assert(res === expectedHtml.replace(/\n$/, ''));
        });
    });
    it('MM-T2244 Markdown tables', () => {
        postMarkdownTest('/test url test-tables.md');
        let postId;
        let expectedHtml;
        cy.getNthPostId(-2).then((id) => {
            postId = id;
            return cy.fixture('markdown/markdown_tables.html', 'utf-8');
        }).then((html) => {
            expectedHtml = html;
            const postMessageTextId = `#postMessageText_${postId}`;
            return cy.get(postMessageTextId).invoke('html');
        }).then((res) => {
            assert(res === expectedHtml.replace(/\n$/, ''));
        });
    });
    it('MM-T2246 Markdown code syntax', () => {
        postMarkdownTest('/test url test-syntax-highlighting');
        let postId;
        let expectedHtml;
        cy.getNthPostId(-2).then((id) => {
            postId = id;
            return cy.fixture('markdown/markdown_code_syntax.html', 'utf-8');
        }).then((html) => {
            expectedHtml = html;
            const postMessageTextId = `#postMessageText_${postId}`;
            return cy.get(postMessageTextId).invoke('html');
        }).then((res) => {
            assert(res === expectedHtml.replace(/\n$/, ''));
        });
    });
});
function postMarkdownTest(slashCommand) {
    cy.postMessage(slashCommand).wait(TIMEOUTS.ONE_SEC);
    cy.uiWaitUntilMessagePostedIncludes('Loaded data');
    cy.wait(TIMEOUTS.ONE_SEC);
}