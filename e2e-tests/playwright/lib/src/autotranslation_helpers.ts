import type {Client4} from '@mattermost/client';
import {mergeWithOnPremServerConfig} from './server/default_config';
export type EnableAutotranslationOptions = {
    mockBaseUrl: string;
    targetLanguages?: string[];
};
export function hasAutotranslationLicense(skuShortName: string): boolean {
    return skuShortName === 'entry' || skuShortName === 'advanced';
}
export async function enableAutotranslationConfig(
    adminClient: Client4,
    options: EnableAutotranslationOptions,
): Promise<void> {
    const config = mergeWithOnPremServerConfig({
        FeatureFlags: {
            AutoTranslation: true,
        },
        AutoTranslationSettings: {
            Enable: true,
            Provider: 'libretranslate',
            LibreTranslate: {
                URL: options.mockBaseUrl,
                APIKey: '',
            },
            TargetLanguages: options.targetLanguages ?? ['en', 'es'],
            RestrictDMAndGM: false,
            Workers: 4,
            TimeoutMs: 5000,
        },
    });
    await adminClient.updateConfig(config as any);
}
export async function disableAutotranslationConfig(adminClient: Client4): Promise<void> {
    const config = mergeWithOnPremServerConfig({
        FeatureFlags: {
            AutoTranslation: false,
        },
        AutoTranslationSettings: {
            Enable: false,
            TargetLanguages: [],
            Workers: 0,
            Provider: '',
            LibreTranslate: {
                URL: '',
                APIKey: '',
            },
            TimeoutMs: 0,
            RestrictDMAndGM: false,
        },
    });
    await adminClient.updateConfig(config as any);
}
export async function enableChannelAutotranslation(adminClient: Client4, channelId: string): Promise<void> {
    await adminClient.patchChannel(channelId, {autotranslation: true} as any);
}
export async function disableChannelAutotranslation(adminClient: Client4, channelId: string): Promise<void> {
    await adminClient.patchChannel(channelId, {autotranslation: false} as any);
}
export async function setMockSourceLanguage(mockBaseUrl: string, language: string): Promise<void> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const res = await fetch(`${mockBaseUrl}/__control/source`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({language}),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                if (res.status === 404) {
                    return;
                }
                throw new Error(`Mock detect failed: ${res.status}`);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    } catch {
    }
}
export async function setUserChannelAutotranslation(
    client: Client4,
    channelId: string,
    enabled: boolean,
): Promise<void> {
    await client.setMyChannelAutotranslation(channelId, enabled);
}