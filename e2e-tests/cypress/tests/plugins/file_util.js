const fs = require('fs');
const path = require('path');
const fileExist = (filename) => {
    const filePath = path.resolve(__dirname, `../fixtures/${filename}`);
    return fs.existsSync(filePath);
};
const writeToFile = ({filename, fixturesFolder, data = ''}) => {
    const folder = path.resolve(__dirname, `../fixtures/${fixturesFolder}`);
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, {recursive: true});
    }
    const filePath = `${folder}/${filename}`;
    fs.writeFileSync(filePath, data);
    return null;
};
module.exports = {
    fileExist,
    writeToFile,
};