const axios = require('axios');
module.exports = async ({data = {}, headers, method = 'get', url}) => {
    let response;
    try {
        response = await axios({
            data,
            headers,
            method,
            url,
        });
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
    return {
        data: response.data,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
    };
};