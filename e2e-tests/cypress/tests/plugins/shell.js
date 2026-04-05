const extractZip = require('extract-zip');
const shell = require('shelljs');
const shellFind = ({path, pattern}) => {
    return shell.find(path).filter((file) => {
        return file.match(pattern);
    });
};
const shellRm = ({option, file}) => {
    return shell.rm(option, file);
};
const shellUnzip = async ({source, target}) => {
    try {
        await extractZip(source, {dir: target});
        return null;
    } catch (err) {
        return err;
    }
};
module.exports = {
    shellFind,
    shellRm,
    shellUnzip,
};