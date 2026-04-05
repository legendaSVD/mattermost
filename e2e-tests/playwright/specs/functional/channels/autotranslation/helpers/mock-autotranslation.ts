import type {Page} from '@playwright/test';
interface MockTranslateRequest {
    q?: string;
    text?: string;
    source?: string;
    target?: string;
}
interface MockTranslateResponse {
    translatedText: string;
    detectedLanguage: {language: string; confidence: number};
}
let mockSourceLanguage = 'es';
export function setMockSourceLanguage(language: string): void {
    mockSourceLanguage = language;
}
export function getMockSourceLanguage(): string {
    return mockSourceLanguage;
}
export function resetMockSourceLanguage(): void {
    mockSourceLanguage = 'es';
}
export async function mockAutotranslationRoute(
    page: Page,
    options?: {
        sourceLanguage?: string;
        supportedLanguages?: string[];
    },
): Promise<void> {
    mockSourceLanguage = options?.sourceLanguage || 'es';
    const supportedLanguages = options?.supportedLanguages || ['en', 'es', 'fr', 'de'];
    await page.route('**/api/translate', async (route) => {
        const request = route.request();
        const method = request.method();
        if (method === 'POST') {
            let postData: MockTranslateRequest;
            try {
                postData = (await request.postDataJSON()) as MockTranslateRequest;
            } catch {
                const postDataBuffer = request.postData();
                if (!postDataBuffer) {
                    await route.abort('failed');
                    return;
                }
                const formData = new URLSearchParams(postDataBuffer.toString());
                postData = {
                    q: formData.get('q') || undefined,
                    text: formData.get('text') || undefined,
                    source: formData.get('source') || undefined,
                    target: formData.get('target') || undefined,
                };
            }
            const textToTranslate = postData.q || postData.text || '';
            const sourceLanguage = postData.source || mockSourceLanguage;
            const targetLanguage = postData.target || 'en';
            if (!supportedLanguages.includes(targetLanguage)) {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: `Target language '${targetLanguage}' is not supported`,
                    }),
                });
                return;
            }
            let translatedText = textToTranslate;
            const shouldTranslate = sourceLanguage !== targetLanguage;
            if (shouldTranslate) {
                translatedText = `[${targetLanguage}] ${textToTranslate}`;
            }
            const response: MockTranslateResponse = {
                translatedText,
                detectedLanguage: {
                    language: sourceLanguage,
                    confidence: 0.95,
                },
            };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response),
            });
        } else if (method === 'GET') {
            const url = new URL(request.url());
            const textToTranslate = url.searchParams.get('q') || '';
            const sourceLanguage = url.searchParams.get('source') || mockSourceLanguage;
            const targetLanguage = url.searchParams.get('target') || 'en';
            if (!supportedLanguages.includes(targetLanguage)) {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: `Target language '${targetLanguage}' is not supported`,
                    }),
                });
                return;
            }
            let translatedText = textToTranslate;
            const shouldTranslate = sourceLanguage !== targetLanguage;
            if (shouldTranslate) {
                translatedText = `[${targetLanguage}] ${textToTranslate}`;
            }
            const response: MockTranslateResponse = {
                translatedText,
                detectedLanguage: {
                    language: sourceLanguage,
                    confidence: 0.95,
                },
            };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response),
            });
        } else {
            await route.abort('failed');
        }
    });
    await page.route('**/api/detect', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                result: [
                    {
                        language: mockSourceLanguage,
                        confidence: 0.95,
                    },
                ],
                detectedLanguage: {language: mockSourceLanguage, confidence: 0.95},
            }),
        });
    });
}
export async function unmockAutotranslationRoute(page: Page): Promise<void> {
    await page.unroute('**/api/translate');
    await page.unroute('**/api/detect');
}