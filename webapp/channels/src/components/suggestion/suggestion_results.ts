import type {MessageDescriptor} from 'react-intl';
export type SuggestionResults<Item = unknown> = SuggestionResultsGrouped<Item> | SuggestionResultsUngrouped<Item>;
export type SuggestionResultsGrouped<Item = unknown> = {
    matchedPretext: string;
    groups: Array<SuggestionResultsGroup<Item>>;
};
export type SuggestionResultsGroup<Item = unknown> = {
    key: string;
    label?: MessageDescriptor;
    terms: string[];
    items: Array<Item | Loading>;
    components: React.ElementType[];
};
export type SuggestionResultsUngrouped<Item = unknown> = {
    matchedPretext: string;
    terms: string[];
    items: Array<Item | Loading>;
    components: React.ElementType[];
};
export type Loading = {
    loading: boolean;
};
export function isItemLoaded<Item>(item: Item | Loading): item is Item {
    return !item || typeof item !== 'object' || !('loading' in item) || !item.loading;
}
export function emptyResults<Item>(): SuggestionResults<Item> {
    return {
        matchedPretext: '',
        terms: [],
        items: [],
        components: [],
    };
}
export function hasResults(results: SuggestionResults): boolean {
    return countResults(results) > 0;
}
export function hasLoadedResults(results: SuggestionResults): boolean {
    if ('groups' in results) {
        return results.groups.some((group) => group.items.some(isItemLoaded));
    }
    return results.items.some(isItemLoaded);
}
export function countResults(results: SuggestionResults): number {
    if ('groups' in results) {
        return results.groups.reduce((count, group) => count + group.items.length, 0);
    }
    return results.items.length;
}
export function getItemForTerm<Item>(results: SuggestionResults<Item>, term: string): Item | undefined {
    if ('groups' in results) {
        for (const group of results.groups) {
            const index = group.terms.indexOf(term);
            if (index !== -1) {
                return group.items[index] as Item;
            }
        }
        return undefined;
    }
    const index = results.terms.indexOf(term);
    return index === -1 ? undefined : results.items[index] as Item;
}
export function flattenTerms(results: SuggestionResults | ProviderResults): string[] {
    if ('groups' in results) {
        return results.groups.flatMap((group) => group.terms);
    }
    return results.terms;
}
export function flattenItems<Item>(results: SuggestionResults<Item> | ProviderResults<Item>): Item[] {
    if ('groups' in results) {
        return results.groups.flatMap((group) => group.items as Item);
    }
    return results.items as Item[];
}
export function hasSuggestionWithComponent(results: SuggestionResults, componentType: React.ElementType) {
    if ('groups' in results) {
        return results.groups.some((group) => group.components.includes(componentType));
    }
    return results.components.includes(componentType);
}
export type ProviderResults<Item = unknown> = ProviderResultsGrouped<Item> | ProviderResultsUngrouped<Item>;
export type ProviderResultsGrouped<Item = unknown> = {
    matchedPretext: string;
    groups: Array<ProviderResultsGroup<Item>>;
}
export type ProviderResultsGroup<Item = unknown> = {
    key: string;
    label?: MessageDescriptor;
    terms: string[];
    items: Array<Item | Loading>;
} & ComponentOrComponents;
export type ProviderResultsUngrouped<Item = unknown> = {
    matchedPretext: string;
    terms: string[];
    items: Array<Item | Loading>;
} & ComponentOrComponents;
type ComponentOrComponents = {
    component: React.ElementType;
} | {
    components: React.ElementType[];
}
export function normalizeResultsFromProvider<Item>(providerResults: ProviderResults<Item>): SuggestionResults<Item> {
    if ('components' in providerResults) {
        return providerResults;
    }
    if ('groups' in providerResults) {
        return {
            matchedPretext: providerResults.matchedPretext,
            groups: providerResults.groups.map((group) => {
                if ('components' in group) {
                    return group;
                }
                const {component, ...otherFields} = group;
                return {
                    ...otherFields,
                    components: new Array(group.terms.length).fill(component),
                };
            }),
        };
    }
    const {component, ...otherFields} = providerResults;
    return {
        ...otherFields,
        components: new Array(providerResults.terms.length).fill(component),
    };
}
export function trimResults(results: SuggestionResults, max: number) {
    if ('groups' in results) {
        let remaining = max;
        let i = 0;
        while (i < results.groups.length && remaining > 0) {
            const group = results.groups[i];
            group.items = group.items.slice(0, remaining);
            group.terms = group.terms.slice(0, remaining);
            group.components = group.components.slice(0, remaining);
            remaining -= group.items.length;
            i += 1;
        }
        if (i < results.groups.length) {
            results.groups = results.groups.slice(0, i);
        }
    } else {
        results.items = results.items.slice(0, max);
        results.terms = results.terms.slice(0, max);
        results.components = results.components.slice(0, max);
    }
    return results;
}