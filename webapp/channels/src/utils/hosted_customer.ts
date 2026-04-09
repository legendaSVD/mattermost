import type {Product} from '@mattermost/types/cloud';
import type {UserProfile} from '@mattermost/types/users';
export const findSelfHostedProductBySku = (products: Record<string, Product>, sku: string): Product | null => {
    const matches = Object.values(products).filter((p) => p.sku === sku);
    if (matches.length > 1) {
        console.error(`Found more than one match for sku ${sku}: ${matches.map((x) => x.id).join(', ')}`);
    } else if (matches.length === 0) {
        return null;
    }
    return matches[0];
};
export const inferNames = (user: UserProfile, cardName: string): [string, string] => {
    if (user.first_name) {
        return [user.first_name, user.last_name];
    }
    const names = cardName.split(' ');
    if (cardName.length === 2) {
        return [names[0], names[1]];
    }
    return [names[0], names.slice(1).join(' ')];
};