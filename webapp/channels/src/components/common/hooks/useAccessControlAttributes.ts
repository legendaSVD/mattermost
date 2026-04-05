import {useState, useEffect, useCallback} from 'react';
import {useDispatch} from 'react-redux';
import type {AccessControlAttribute} from '@mattermost/types/access_control';
import {getChannelAccessControlAttributes} from 'mattermost-redux/actions/channels';
export enum EntityType {
    Channel = 'channel',
}
const attributesCache: Record<string, {
    processedData: {
        attributeTags: string[];
        structuredAttributes: AccessControlAttribute[];
    };
    timestamp: number;
}> = {};
const CACHE_TTL = 5 * 60 * 1000;
const SUPPORTED_ENTITY_TYPES = Object.values(EntityType);
export const useAccessControlAttributes = (
    entityType: EntityType,
    entityId: string | undefined,
    hasAccessControl: boolean | undefined,
) => {
    const [attributeTags, setAttributeTags] = useState<string[]>([]);
    const [structuredAttributes, setStructuredAttributes] = useState<AccessControlAttribute[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const dispatch = useDispatch();
    const processAttributeData = useCallback((data: Record<string, string[]> | undefined) => {
        if (!data) {
            setAttributeTags([]);
            setStructuredAttributes([]);
            return;
        }
        const tags: string[] = [];
        const attributes: AccessControlAttribute[] = [];
        Object.entries(data).forEach(([name, values]) => {
            if (Array.isArray(values)) {
                attributes.push({name, values: [...values]});
                values.forEach((value) => {
                    if (value !== undefined && value !== null) {
                        tags.push(value);
                    }
                });
            }
        });
        setAttributeTags(tags);
        setStructuredAttributes(attributes);
    }, []);
    const fetchAttributes = useCallback(async (forceRefresh = false) => {
        if (!entityId || !hasAccessControl) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
                throw new Error(`Unsupported entity type: ${entityType}`);
            }
            const cacheKey = `${entityType}:${entityId}`;
            const cachedEntry = attributesCache[cacheKey];
            const now = Date.now();
            if (!forceRefresh && cachedEntry && (now - cachedEntry.timestamp < CACHE_TTL)) {
                setAttributeTags(cachedEntry.processedData.attributeTags);
                setStructuredAttributes(cachedEntry.processedData.structuredAttributes);
                setLoading(false);
                return;
            }
            let result;
            switch (entityType) {
            case EntityType.Channel:
                result = await dispatch(getChannelAccessControlAttributes(entityId));
                break;
            default:
                throw new Error(`Unsupported entity type: ${entityType}`);
            }
            if (result.error) {
                throw result.error;
            }
            const data = result.data;
            if (data) {
                const processedTags: string[] = [];
                const processedAttributes: AccessControlAttribute[] = [];
                Object.entries(data).forEach(([name, values]) => {
                    if (Array.isArray(values)) {
                        processedAttributes.push({name, values: [...values]});
                        values.forEach((value) => {
                            if (value !== undefined && value !== null) {
                                processedTags.push(value);
                            }
                        });
                    }
                });
                attributesCache[cacheKey] = {
                    processedData: {
                        attributeTags: processedTags,
                        structuredAttributes: processedAttributes,
                    },
                    timestamp: now,
                };
                setAttributeTags(processedTags);
                setStructuredAttributes(processedAttributes);
            } else {
                setAttributeTags([]);
                setStructuredAttributes([]);
            }
        } catch (err) {
            setError(err as Error);
            setAttributeTags([]);
            setStructuredAttributes([]);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, hasAccessControl, processAttributeData]);
    useEffect(() => {
        fetchAttributes();
    }, [fetchAttributes]);
    return {
        attributeTags,
        structuredAttributes,
        loading,
        error,
        fetchAttributes,
    };
};
export default useAccessControlAttributes;