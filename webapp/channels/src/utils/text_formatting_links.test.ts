import store from 'stores/redux_store';
import {makeInitialState} from 'packages/mattermost-redux/test/test_store';
import EmojiMap from 'utils/emoji_map';
import * as Markdown from 'utils/markdown';
import * as TextFormatting from 'utils/text_formatting';
const emojiMap = new EmojiMap(new Map());
describe('Markdown.Links', () => {
    it('Not links', () => {
        expect(Markdown.format('example.com').trim()).toBe(
            '<p>example.com</p>',
        );
        expect(Markdown.format('readme.md').trim()).toBe(
            '<p>readme.md</p>',
        );
        expect(Markdown.format('@example.com').trim()).toBe(
            '<p>@example.com</p>',
        );
        expect(Markdown.format('./make-compiled-client.sh').trim()).toBe(
            '<p>./make-compiled-client.sh</p>',
        );
        expect(Markdown.format('`https://example.com`').trim()).toBe(
            '<p>' +
                '<span class="codespan__pre-wrap">' +
                    '<code>' +
                        'https://example.com' +
                    '</code>' +
                '</span>' +
            '</p>',
        );
        expect(Markdown.format('[link](example.com').trim()).toBe(
            '<p>[link](example.com</p>',
        );
    });
    it('External links', () => {
        expect(Markdown.format('http://example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('https://example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('www.example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/index').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/index.html').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/index/sub').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www1.example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('example.com/index').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('IP addresses', () => {
        expect(Markdown.format('http://127.0.0.1').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://192.168.1.1:4040').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://[::1]:80').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://[::1]:8065').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('https://[::1]:80').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('http://[2001:0:5ef5:79fb:303a:62d5:3312:ff42]:80').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://[2001:0:5ef5:79fb:303a:62d5:3312:ff42]:8065').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('https://[2001:0:5ef5:79fb:303a:62d5:3312:ff42]:443').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('http://username:password@127.0.0.1').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://username:password@[2001:0:5ef5:79fb:303a:62d5:3312:ff42]:80').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('Links with anchors', () => {
        expect(Markdown.format('https://en.wikipedia.org/wiki/URLs#Syntax').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('https://groups.google.com/forum/#!msg').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
    });
    it('Links with parameters', () => {
        expect(Markdown.format('www.example.com/index?params=1').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/index?params=1&other=2').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/index?params=1;other=2').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://example.com:8065').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://username:password@example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('Special characters', () => {
        expect(Markdown.format('http://www.example.com/_/page').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('www.example.com/_/page').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('https://en.wikipedia.org/wiki/🐬').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('http://✪df.ws/1234').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('Brackets', () => {
        expect(Markdown.format('https://en.wikipedia.org/wiki/Rendering_(computer_graphics)').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('http://example.com/more_(than)_one_(parens)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://example.com/(something)?after=parens').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('http://foo.com/unicode_(✪)_in_parens').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('Email addresses', () => {
        expect(Markdown.format('test@example.com').trim()).toBe(
            '<p><a class="theme" href="mailto:test@example.com" rel="noreferrer" target="_blank">test@example.com</a></p>',
        );
        expect(Markdown.format('test_underscore@example.com').trim()).toBe(
            '<p><a class="theme" href="mailto:test_underscore@example.com" rel="noreferrer" target="_blank">test_underscore@example.com</a></p>',
        );
        expect(Markdown.format('mailto:test@example.com').trim()).toBe(
            '<p><a class="theme markdown__link" href="mailto:test@example.com" rel="noreferrer" target="_blank">mailto:test@example.com</a></p>',
        );
    });
    it('Formatted links', () => {
        expect(Markdown.format('*https://example.com*').trim()).toBe(
            '<p><em><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('_https://example.com_').trim()).toBe(
            '<p><em><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('**https://example.com**').trim()).toBe(
            '<p><strong><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('__https://example.com__').trim()).toBe(
            '<p><strong><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('***https://example.com***').trim()).toBe(
            '<p><strong><em><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('___https://example.com___').trim()).toBe(
            '<p><strong><em><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('<https://example.com>').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('<https://en.wikipedia.org/wiki/Rendering_(computer_graphics)>').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
    });
    it('Links with text', () => {
        expect(Markdown.format('[example link](example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[example.com](example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[example.com/other](example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[example.com/other_link](example.com/example)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[link with spaces](example.com/ spaces in the url)').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[This whole #sentence should be a link](https://example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('[email link](mailto:test@example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="mailto:test@example.com" rel="noreferrer" target="_blank">email link</a></p>',
        );
        expect(Markdown.format('[other link](ts3server://example.com)').trim()).toBe(
            '<p><a class="theme markdown__link" href="ts3server:
        );
    });
    it('Links with tooltips', () => {
        expect(Markdown.format('[link](example.com "catch phrase!")').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[link](example.com "title with "quotes"")').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('[link with spaces](example.com/ spaces in the url "and a title")').trim()).toBe(
            '<p><a class="theme markdown__link" href="http:
        );
    });
    it('Links with surrounding text', () => {
        expect(Markdown.format('This is a sentence with a http://example.com in it.').trim()).toBe(
            '<p>This is a sentence with a <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a sentence with a http://example.com/_/underscore in it.').trim()).toBe(
            '<p>This is a sentence with a <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a sentence with a http://192.168.1.1:4040 in it.').trim()).toBe(
            '<p>This is a sentence with a <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a sentence with a https://[::1]:80 in it.').trim()).toBe(
            '<p>This is a sentence with a <a class="theme markdown__link" href="https:
        );
    });
    it('Links with trailing punctuation', () => {
        expect(Markdown.format('This is a link to http://example.com.').trim()).toBe(
            '<p>This is a link to <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a link containing http://example.com/something?with,commas,in,url, but not at the end').trim()).toBe(
            '<p>This is a link containing <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a question about a link http://example.com?').trim()).toBe(
            '<p>This is a question about a link <a class="theme markdown__link" href="http:
        );
    });
    it('Links with surrounding brackets', () => {
        expect(Markdown.format('(http://example.com)').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(see http://example.com)').trim()).toBe(
            '<p>(see <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(http://example.com watch this)').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(www.example.com)').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(see www.example.com)').trim()).toBe(
            '<p>(see <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(www.example.com watch this)').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('([link](http://example.com))').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(see [link](http://example.com))').trim()).toBe(
            '<p>(see <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('([link](http://example.com) watch this)').trim()).toBe(
            '<p>(<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('(test@example.com)').trim()).toBe(
            '<p>(<a class="theme" href="mailto:test@example.com" rel="noreferrer" target="_blank">test@example.com</a>)</p>',
        );
        expect(Markdown.format('(email test@example.com)').trim()).toBe(
            '<p>(email <a class="theme" href="mailto:test@example.com" rel="noreferrer" target="_blank">test@example.com</a>)</p>',
        );
        expect(Markdown.format('(test@example.com email)').trim()).toBe(
            '<p>(<a class="theme" href="mailto:test@example.com" rel="noreferrer" target="_blank">test@example.com</a> email)</p>',
        );
        expect(Markdown.format('This is a sentence with a [link](http://example.com) in it.').trim()).toBe(
            '<p>This is a sentence with a <a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a sentence with a link (http://example.com) in it.').trim()).toBe(
            '<p>This is a sentence with a link (<a class="theme markdown__link" href="http:
        );
        expect(Markdown.format('This is a sentence with a (https://en.wikipedia.org/wiki/Rendering_(computer_graphics)) in it.').trim()).toBe(
            '<p>This is a sentence with a (<a class="theme markdown__link" href="https:
        );
    });
    it('Searching for links', () => {
        expect(TextFormatting.formatText('https://en.wikipedia.org/wiki/Unix', {searchTerm: 'wikipedia'}, emojiMap).trim()).toBe(
            '<p><a class="theme markdown__link search-highlight" href="https:
        );
        expect(TextFormatting.formatText('[Link](https://en.wikipedia.org/wiki/Unix)', {searchTerm: 'unix'}, emojiMap).trim()).toBe(
            '<p><a class="theme markdown__link search-highlight" href="https:
        );
    });
    it('Links containing %', () => {
        expect(Markdown.format('https://en.wikipedia.org/wiki/%C3%89').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
        expect(Markdown.format('https://en.wikipedia.org/wiki/%E9').trim()).toBe(
            '<p><a class="theme markdown__link" href="https:
        );
    });
    it('Relative link', () => {
        expect(Markdown.format('[A Relative Link](/static/files/5b4a7904a3e041018526a00dba59ee48.png)').trim()).toBe(
            '<p><a class="theme markdown__link" href="/static/files/5b4a7904a3e041018526a00dba59ee48.png" rel="noreferrer" target="_blank">A Relative Link</a></p>',
        );
    });
    describe('autolinkedUrlSchemes', () => {
        test('only some types of links are rendered when there are custom URL schemes defined', () => {
            jest.spyOn(store, 'getState').mockReturnValue(makeInitialState({
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: '',
                        },
                    },
                },
            }));
            expect(Markdown.format('http://example.com').trim()).toBe(`<p>${link('http://example.com')}</p>`);
            expect(Markdown.format('https://example.com').trim()).toBe(`<p>${link('https://example.com')}</p>`);
            expect(Markdown.format('ftp://ftp.example.com').trim()).toBe(`<p>${link('ftp://ftp.example.com')}</p>`);
            expect(Markdown.format('tel:1-555-123-4567').trim()).toBe(`<p>${link('tel:1-555-123-4567')}</p>`);
            expect(Markdown.format('mailto:test@example.com').trim()).toBe(`<p>${link('mailto:test@example.com')}</p>`);
            expect(Markdown.format('git://git.example.com').trim()).toBe('<p>git://git.example.com</p>');
            expect(Markdown.format('test:test').trim()).toBe('<p>test:test</p>');
            expect(Markdown.format('test.:test').trim()).toBe('<p>test.:test</p>');
            expect(Markdown.format('taco+what://example.com').trim()).toBe('<p>taco+what://example.com</p>');
            expect(Markdown.format('taco.what://example.com').trim()).toBe('<p>taco.what://example.com</p>');
        });
        test('matching links are rendered when schemes are provided', () => {
            jest.spyOn(store, 'getState').mockReturnValue(makeInitialState({
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: 'git,test,test.,taco+what,taco.what',
                        },
                    },
                },
            }));
            expect(Markdown.format('http://example.com').trim()).toBe(`<p>${link('http://example.com')}</p>`);
            expect(Markdown.format('https://example.com').trim()).toBe(`<p>${link('https://example.com')}</p>`);
            expect(Markdown.format('ftp://ftp.example.com').trim()).toBe(`<p>${link('ftp://ftp.example.com')}</p>`);
            expect(Markdown.format('tel:1-555-123-4567').trim()).toBe(`<p>${link('tel:1-555-123-4567')}</p>`);
            expect(Markdown.format('mailto:test@example.com').trim()).toBe(`<p>${link('mailto:test@example.com')}</p>`);
            expect(Markdown.format('git://git.example.com').trim()).toBe(`<p>${link('git://git.example.com')}</p>`);
            expect(Markdown.format('test:test').trim()).toBe(`<p>${link('test:test')}</p>`);
            expect(Markdown.format('test.:test').trim()).toBe(`<p>${link('test.:test')}</p>`);
            expect(Markdown.format('taco+what://example.com').trim()).toBe(`<p>${link('taco+what://example.com')}</p>`);
            expect(Markdown.format('taco.what://example.com').trim()).toBe(`<p>${link('taco.what://example.com')}</p>`);
        });
        test('explicit links are not affected by this setting', () => {
            jest.spyOn(store, 'getState').mockReturnValue(makeInitialState({
                entities: {
                    general: {
                        config: {
                            CustomUrlSchemes: '',
                        },
                    },
                },
            }));
            expect(Markdown.format('www.example.com').trim()).toBe(`<p>${link('http://www.example.com', 'www.example.com')}</p>`);
            expect(Markdown.format('[link](git://git.example.com)').trim()).toBe(`<p>${link('git://git.example.com', 'link')}</p>`);
            expect(Markdown.format('<git://git.example.com>').trim()).toBe(`<p>${link('git://git.example.com')}</p>`);
        });
    });
});
function link(href: string, text?: string, title?: string) {
    let out = `<a class="theme markdown__link" href="${href}" rel="noreferrer" target="_blank"`;
    if (title) {
        out += ` title="${title}"`;
    }
    out += `>${text || href}</a>`;
    return out;
}