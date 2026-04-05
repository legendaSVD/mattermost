export function buildQueryString(queryParams = {}) {
    let queryString = '';
    Object.entries(queryParams).forEach(([k, v], index) => {
        if (index > 0) {
            queryString += '&';
        }
        queryString += `${k}=${encodeURIComponent(v)}`;
    });
    return queryString;
}