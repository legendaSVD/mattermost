const postMessageAs = require('./post_message_as');
module.exports = async ({numberOfMessages, ...rest}) => {
    const results = [];
    for (let i = 0; i < numberOfMessages; i++) {
        results.push(await postMessageAs({message: `Message ${i}`, ...rest}));
    }
    return results;
};