const fs = require('fs');
const {PDFParse} = require('pdf-parse');
module.exports = async (filePath) => {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({data: dataBuffer});
    try {
        const text = await parser.getText();
        const info = await parser.getInfo();
        return {text, info, numpages: info.numPages};
    } finally {
        await parser.destroy();
    }
};