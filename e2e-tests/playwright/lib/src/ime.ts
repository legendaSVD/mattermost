import type {Page} from '@playwright/test';
export const koreanTestPhrase = '한글이 잘 입력되는지 테스트';
export async function typeKoreanWithIme(page: Page, text: string) {
    const client = await page.context().newCDPSession(page);
    for (const decomposed of decomposeKorean(text)) {
        if (decomposed.jama) {
            await client.send('Input.imeSetComposition', {
                selectionStart: -1,
                selectionEnd: -1,
                text: decomposed.jama[0],
            });
            await client.send('Input.imeSetComposition', {
                selectionStart: -1,
                selectionEnd: -1,
                text: (decomposed.jama[0] + decomposed.jama[1]).normalize('NFKD'),
            });
            await client.send('Input.imeSetComposition', {
                selectionStart: -1,
                selectionEnd: -1,
                text: decomposed.character,
            });
            await client.send('Input.insertText', {
                text: decomposed.character,
            });
        } else {
            await client.send('Input.insertText', {
                text: decomposed.character,
            });
        }
    }
    await client.detach();
}
function decomposeKorean(text: string): Array<{character: string; jama?: string[]}> {
    const hangulStart = 0xac00;
    const hangulEnd = 0xd7a3;
    const initial = [
        'ㄱ',
        'ㄲ',
        'ㄴ',
        'ㄷ',
        'ㄸ',
        'ㄹ',
        'ㅁ',
        'ㅂ',
        'ㅃ',
        'ㅅ',
        'ㅆ',
        'ㅇ',
        'ㅈ',
        'ㅉ',
        'ㅊ',
        'ㅋ',
        'ㅌ',
        'ㅍ',
        'ㅎ',
    ];
    const medial = [
        'ㅏ',
        'ㅐ',
        'ㅑ',
        'ㅒ',
        'ㅓ',
        'ㅔ',
        'ㅕ',
        'ㅖ',
        'ㅗ',
        'ㅘ',
        'ㅙ',
        'ㅚ',
        'ㅛ',
        'ㅜ',
        'ㅝ',
        'ㅞ',
        'ㅟ',
        'ㅠ',
        'ㅡ',
        'ㅢ',
        'ㅣ',
    ];
    const final = [
        '',
        'ㄱ',
        'ㄲ',
        'ㄳ',
        'ㄴ',
        'ㄵ',
        'ㄶ',
        'ㄷ',
        'ㄹ',
        'ㄺ',
        'ㄻ',
        'ㄼ',
        'ㄽ',
        'ㄾ',
        'ㄿ',
        'ㅀ',
        'ㅁ',
        'ㅂ',
        'ㅄ',
        'ㅅ',
        'ㅆ',
        'ㅇ',
        'ㅈ',
        'ㅊ',
        'ㅋ',
        'ㅌ',
        'ㅍ',
        'ㅎ',
    ];
    const result = [];
    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        const code = character.charCodeAt(i);
        if (code >= hangulStart && code <= hangulEnd) {
            const syllableIndex = code - hangulStart;
            const initialIndex = Math.floor(syllableIndex / (21 * 28));
            const medialIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
            const finalIndex = syllableIndex % 28;
            const jama = [];
            jama.push(initial[initialIndex]);
            jama.push(medial[medialIndex]);
            if (final[finalIndex]) {
                jama.push(final[finalIndex]);
            }
            result.push({character, jama});
        } else {
            result.push({character});
        }
    }
    return result;
}