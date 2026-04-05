module.exports.format = (msgs) => {
    return Object.keys(msgs).reduce((all, k) => {
        all[k] = msgs[k].defaultMessage;
        return all;
    }, {});
};
module.exports.compile = (msgs) => msgs;
module.exports.compareMessages = (el1, el2) => {
    const key1 = el1.key.toLowerCase().replace(/_/g, '\x00');
    const key2 = el2.key.toLowerCase().replace(/_/g, '\x00');
    if (key1 < key2) {
        return -1;
    }
    if (key1 > key2) {
        return 1;
    }
    return 0;
};