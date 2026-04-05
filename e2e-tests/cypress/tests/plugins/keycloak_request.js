const axios = require('axios');
module.exports = async ({baseUrl, headers = [], method = 'get', path = '', data = {}}) => {
    let response;
    try {
        response = await axios({
            method,
            url: `${baseUrl}/${path}`,
            headers,
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