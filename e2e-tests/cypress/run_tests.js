const os = require('os');
const chalk = require('chalk').default;
const cypress = require('cypress');
const argv = require('yargs')(process.argv.slice(2)).argv;
const {getSortedTestFiles} = require('./utils/file');
const {getTestFilesIdentifier} = require('./utils/even_distribution');
const {writeJsonToFile} = require('./utils/report');
const {MOCHAWESOME_REPORT_DIR, RESULTS_DIR} = require('./utils/constants');
require('dotenv').config();
async function runTests() {
    const {
        BRANCH,
        BROWSER,
        BUILD_ID,
        HEADLESS,
    } = process.env;
    const browser = BROWSER || 'chrome';
    const headless = typeof HEADLESS === 'undefined' ? true : HEADLESS === 'true';
    const platform = os.platform();
    const stressTestCount = argv.stressTestCount > 1 ? argv.stressTestCount : 1;
    const testPasses = {};
    const sortedFilesObject = getSortedTestFiles(platform, browser, headless);
    const sortedFiles = sortedFilesObject.sortedFiles.flatMap((el) => Array(stressTestCount).fill(el));
    const numberOfTestFiles = sortedFiles.length;
    if (!numberOfTestFiles) {
        console.log(chalk.red('Nothing to test!'));
        return;
    }
    const {
        start,
        end,
        count,
    } = getTestFilesIdentifier(numberOfTestFiles, argv.part, argv.of);
    for (let i = start, j = 0; i < end && j < count; i++, j++) {
        printMessage(sortedFiles, i, j + 1, count);
        const testFile = sortedFiles[i];
        let testFileAttempt = 1;
        if (testFile in testPasses === false) {
            testPasses[testFile] = {attempt: 1};
        } else {
            testPasses[testFile].attempt += 1;
            testFileAttempt = testPasses[testFile].attempt;
        }
        const result = await cypress.run({
            browser,
            headless,
            spec: testFile,
            config: {
                screenshotsFolder: `${MOCHAWESOME_REPORT_DIR}/screenshots`,
                videosFolder: `${MOCHAWESOME_REPORT_DIR}/videos`,
                trashAssetsBeforeRuns: false,
                retries: stressTestCount > 1 ? 0 : 2,
            },
            env: {
                firstTest: j === 0,
            },
            reporter: 'cypress-multi-reporters',
            reporterOptions: {
                reporterEnabled: 'mocha-junit-reporter, mochawesome',
                mochaJunitReporterReporterOptions: {
                    mochaFile: 'results/junit/test_results[hash].xml',
                    toConsole: false,
                },
                mochawesomeReporterOptions: {
                    reportDir: MOCHAWESOME_REPORT_DIR,
                    reportFilename: `json/${testFile}`,
                    quiet: true,
                    overwrite: false,
                    html: false,
                    json: true,
                    testMeta: {
                        platform,
                        browser,
                        headless,
                        branch: BRANCH,
                        buildId: BUILD_ID,
                        testFileAttempt,
                    },
                },
            },
        });
        for (const testCase of result.runs[0].tests) {
            const testCaseTitle = testCase.title.join(' - ');
            if (testCaseTitle in testPasses[testFile] === false) {
                testPasses[testFile][testCaseTitle] = 0;
            }
            if (testCase.state === 'passed') {
                testPasses[testFile][testCaseTitle] += 1;
            }
        }
        if (i === 0) {
            const environment = {
                cypress_version: result.cypressVersion,
                browser_name: result.browserName,
                browser_version: result.browserVersion,
                headless,
                os_name: result.osName,
                os_version: result.osVersion,
                node_version: process.version,
            };
            writeJsonToFile(environment, 'environment.json', RESULTS_DIR);
        }
    }
    writeJsonToFile(testPasses, 'testPasses.json', RESULTS_DIR);
}
function printMessage(testFiles, overallIndex, currentItem, lastItem) {
    const {invert, excludeGroup, group, stage} = argv;
    const testFile = testFiles[overallIndex];
    const testStage = stage ? `Stage: "${stage}" ` : '';
    const withGroup = group || excludeGroup;
    const groupMessage = group ? `"${group}"` : 'All';
    const excludeGroupMessage = excludeGroup ? `except "${excludeGroup}"` : '';
    const testGroup = withGroup ? `Group: ${groupMessage} ${excludeGroupMessage}` : '';
    console.log(chalk.magenta.bold(`${invert ? 'All Except --> ' : ''}${testStage}${stage && withGroup ? '| ' : ''}${testGroup}`));
    console.log(chalk.magenta(`(Testing ${overallIndex + 1} of ${testFiles.length})  - `, testFile));
    if (process.env.CI_BASE_URL) {
        console.log(chalk.magenta(`Testing ${currentItem}/${lastItem} in "${process.env.CI_BASE_URL}" server`));
    }
}
runTests();