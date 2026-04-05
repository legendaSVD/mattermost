const {merge} = require('mochawesome-merge');
const generator = require('mochawesome-report-generator');
const {
    generateDiagnosticReport,
    generateShortSummary,
    generateTestReport,
    removeOldGeneratedReports,
    sendReport,
    readJsonFromFile,
    writeJsonToFile,
} = require('./utils/report');
const {saveArtifacts} = require('./utils/artifacts');
const {MOCHAWESOME_REPORT_DIR, RESULTS_DIR} = require('./utils/constants');
const {createTestCycle, createTestExecutions} = require('./utils/test_cases');
require('dotenv').config();
const saveReport = async () => {
    const {
        BRANCH,
        BUILD_ID,
        BUILD_TAG,
        DIAGNOSTIC_WEBHOOK_URL,
        DIAGNOSTIC_USER_ID,
        DIAGNOSTIC_TEAM_ID,
        TM4J_ENABLE,
        TM4J_CYCLE_KEY,
        TYPE,
        WEBHOOK_URL,
    } = process.env;
    removeOldGeneratedReports();
    const jsonReport = await merge({files: [`${MOCHAWESOME_REPORT_DIR}*.json`]});
    writeJsonToFile(jsonReport, 'all.json', MOCHAWESOME_REPORT_DIR);
    await generator.create(
        jsonReport,
        {
            reportDir: MOCHAWESOME_REPORT_DIR,
            reportTitle: `Build:${BUILD_ID} Branch: ${BRANCH} Tag: ${BUILD_TAG}`,
        },
    );
    const summary = generateShortSummary(jsonReport);
    console.log(summary);
    writeJsonToFile(summary, 'summary.json', MOCHAWESOME_REPORT_DIR);
    const result = await saveArtifacts();
    if (result && result.success) {
        console.log('Successfully uploaded artifacts to S3:', result.reportLink);
    }
    let testCycle = {};
    if (TM4J_ENABLE === 'true') {
        const {start, end} = jsonReport.stats;
        testCycle = TM4J_CYCLE_KEY ? {key: TM4J_CYCLE_KEY} : await createTestCycle(start, end);
    }
    if (TYPE && TYPE !== 'NONE' && WEBHOOK_URL) {
        const environment = readJsonFromFile(`${RESULTS_DIR}/environment.json`);
        const data = generateTestReport(summary, result && result.success, result && result.reportLink, environment, testCycle.key);
        await sendReport('summary report to Community channel', WEBHOOK_URL, data);
    }
    if (TYPE === 'RELEASE' && DIAGNOSTIC_WEBHOOK_URL && DIAGNOSTIC_USER_ID && DIAGNOSTIC_TEAM_ID) {
        const data = generateDiagnosticReport(summary, {userId: DIAGNOSTIC_USER_ID, teamId: DIAGNOSTIC_TEAM_ID});
        await sendReport('test info for diagnostic analysis', DIAGNOSTIC_WEBHOOK_URL, data);
    }
    if (TM4J_ENABLE === 'true') {
        await createTestExecutions(jsonReport, testCycle);
    }
};
saveReport();