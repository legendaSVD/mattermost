const axios = require('axios');
module.exports = async ({baseUrl, urlSuffix, method = 'get', token, data = {}}) => {
    let response;
    try {
        response = await axios({
            url: baseUrl + urlSuffix,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Authorization: token,
            },
            method,
            data,
        });
        return {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
        };
    } catch (error) {
        if (error.response) {
            response = {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
            };
        } else {
            throw error;
        }
    }
    return response;
};