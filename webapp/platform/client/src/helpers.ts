export function buildQueryString(parameters: Record<string, any>): string {
    const keys = Object.keys(parameters);
    if (keys.length === 0) {
        return '';
    }
    const queryParams = Object.entries(parameters).
        filter(([_, value]) => value !== undefined).
        map(([key, value]) => `${key}=${encodeURIComponent(value)}`).
        join('&');
    return queryParams.length > 0 ? `?${queryParams}` : '';
}