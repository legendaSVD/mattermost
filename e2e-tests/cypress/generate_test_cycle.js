const os = require('os');
const chalk = require('chalk').default;
const {createAndStartCycle} = require('./utils/dashboard');
const {getSortedTestFiles} = require('./utils/file');
require('dotenv').config();
const {
    BRANCH,
    BROWSER,
    BUILD_ID,
    HEADLESS,
    REPO,
} = process.env;
async function main() {
    const browser = BROWSER || 'chrome';
    const headless = typeof HEADLESS === 'undefined' ? true : HEADLESS === 'true';
    const platform = os.platform();
    const {weightedTestFiles} = getSortedTestFiles(platform, browser, headless);
    if (!weightedTestFiles.length) {
        console.log(chalk.red('Nothing to test!'));
        return;
    }
    const data = await createAndStartCycle({
        repo: REPO,
        branch: BRANCH,
        build: BUILD_ID,
        files: weightedTestFiles,
    });
    console.log(chalk.green('Successfully generated a test cycle.'));
    console.log(data.cycle);
}
main();