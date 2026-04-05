import * as TIMEOUTS from '../../../fixtures/timeouts';
describe('Environment', () => {
    let townsquareLink;
    let testTeam;
    const mattermostIcon = 'mattermost-icon_128x128.png';
    before(() => {
        cy.shouldNotRunOnCloudEdition();
        cy.apiInitSetup().then(({team}) => {
            testTeam = team;
            townsquareLink = `/${team.name}/channels/town-square`;
        });
    });
    it('MM-T959 - Web server mode - Webserver gzip', () => {
        cy.visit('/admin_console/environment/web_server');
        cy.findByTestId('ServiceSettings.WebserverModedropdown').should('have.value', 'gzip');
        cy.visit(townsquareLink);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('i[title="Edit Icon"]').should('be.visible');
            cy.findByTestId('uploadPicture').attachFile(mattermostIcon);
            cy.uiSave().wait(TIMEOUTS.HALF_SEC);
            cy.get('button[aria-label="Close"]').should('be.visible').click();
        });
        cy.get(`#${testTeam.name}TeamButton`).scrollIntoView().within(() => {
            cy.findByTestId('teamIconImage').then((imageDiv) => {
                const url = imageDiv.css('background-image').split('"')[1];
                cy.request({url, encoding: 'base64'}).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body).to.not.be.null;
                });
            });
        });
    });
    it('MM-T960 - Web server mode - Webserver Uncompressed', () => {
        cy.visit('/admin_console/environment/web_server');
        cy.findByTestId('ServiceSettings.WebserverModedropdown').select('Uncompressed');
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.visit(townsquareLink);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('i[title="Edit Icon"]').should('be.visible');
            cy.findByTestId('uploadPicture').attachFile(mattermostIcon);
            cy.uiSave().wait(TIMEOUTS.HALF_SEC);
            cy.get('button[aria-label="Close"]').should('be.visible').click();
        });
        cy.get(`#${testTeam.name}TeamButton`).scrollIntoView().within(() => {
            cy.findByTestId('teamIconImage').then((imageDiv) => {
                const url = imageDiv.css('background-image').split('"')[1];
                cy.request({url, encoding: 'base64'}).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body).to.not.be.null;
                });
            });
        });
    });
    it('MM-T961 - Web server mode - Webserver Disabled', () => {
        cy.visit('/admin_console/environment/web_server');
        cy.findByTestId('ServiceSettings.WebserverModedropdown').select('Disabled');
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.visit(townsquareLink);
        cy.uiOpenTeamMenu('Team settings');
        cy.get('#teamSettingsModal').should('exist').within(() => {
            cy.get('i[title="Edit Icon"]').should('be.visible');
            cy.findByTestId('uploadPicture').attachFile(mattermostIcon);
            cy.uiSave().wait(TIMEOUTS.HALF_SEC);
            cy.get('button[aria-label="Close"]').should('be.visible').click();
        });
        cy.get(`#${testTeam.name}TeamButton`).scrollIntoView().within(() => {
            cy.findByTestId('teamIconImage').then((imageDiv) => {
                const url = imageDiv.css('background-image').split('"')[1];
                cy.request({url, encoding: 'base64'}).then((response) => {
                    expect(response.status).to.equal(200);
                    expect(response.body).to.not.be.null;
                });
            });
        });
    });
    it('MM-T991 - Database fields can be edited and saved', () => {
        cy.visit('/admin_console/environment/database');
        const queryTimeoutValue = 100;
        const maxOpenConnsValue = 1000;
        cy.findByTestId('queryTimeoutinput').clear().type(queryTimeoutValue);
        cy.findByTestId('maxOpenConnsinput').clear().type(maxOpenConnsValue);
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.apiGetConfig().then(({config}) => {
            expect(config.SqlSettings.QueryTimeout).to.eq(queryTimeoutValue);
            expect(config.SqlSettings.MaxOpenConns).to.eq(maxOpenConnsValue);
        });
    });
    it('MM-T993 - Minimum hashtag length at least 2', () => {
        const defaultHashtagLength = 3;
        const minimumHashtagLength = 2;
        function setAndVerifyHashtagLength(length) {
            cy.findByTestId('minimumHashtagLengthinput').clear().type(length);
            cy.get('#saveSetting').click({force: true}).wait(TIMEOUTS.ONE_SEC);
            cy.apiGetConfig().then(({config}) => {
                const expectedLength = length < minimumHashtagLength ? defaultHashtagLength : length;
                expect(config.ServiceSettings.MinimumHashtagLength).to.eq(expectedLength);
            });
        }
        cy.visit('/admin_console/environment/database');
        setAndVerifyHashtagLength(4);
        setAndVerifyHashtagLength(1);
        setAndVerifyHashtagLength(2);
    });
    it('MM-T995 - Amazon S3 settings', () => {
        cy.visit('/admin_console/environment/file_storage');
        cy.findByTestId('FileSettings.DriverNamedropdown').select('Amazon S3');
        cy.findByTestId('FileSettings.Directoryinput').should('be.disabled');
        cy.findByTestId('FileSettings.MaxFileSizenumber').should('not.be.disabled');
        cy.findByTestId('FileSettings.AmazonS3Bucketinput').should('not.be.disabled');
        cy.findByTestId('FileSettings.AmazonS3PathPrefixinput').should('not.be.disabled');
        cy.findByTestId('FileSettings.AmazonS3Regioninput').should('not.be.disabled');
        cy.findByTestId('FileSettings.AmazonS3AccessKeyIdinput').should('not.be.disabled');
        const amazonS3BucketName = 'test';
        const amazonS3PathPrefix = 'test';
        cy.findByTestId('FileSettings.MaxFileSizenumber').clear().type(52428800);
        cy.findByTestId('FileSettings.AmazonS3Bucketinput').clear().type(amazonS3BucketName);
        cy.findByTestId('FileSettings.AmazonS3PathPrefixinput').clear().type(amazonS3PathPrefix);
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.apiGetConfig().then(({config}) => {
            expect(config.FileSettings.AmazonS3Bucket).to.eq(amazonS3BucketName);
            expect(config.FileSettings.AmazonS3PathPrefix).to.eq(amazonS3PathPrefix);
        });
    });
    it('MM-T996 - Amazon S3 connection error messaging', () => {
        cy.visit('/admin_console/environment/file_storage');
        cy.findByTestId('FileSettings.DriverNamedropdown').select('Amazon S3');
        const amazonS3PathPrefix = 'test';
        cy.findByTestId('FileSettings.AmazonS3Bucketinput').clear();
        cy.findByTestId('FileSettings.AmazonS3PathPrefixinput').scrollIntoView().clear().type(amazonS3PathPrefix);
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.get('#TestS3Connection').scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Test Connection').should('be.visible').click().wait(TIMEOUTS.ONE_SEC);
            waitForAlert('Connection unsuccessful: S3 Bucket is required');
        });
        const amazonS3BucketName = '12';
        cy.findByTestId('FileSettings.AmazonS3Bucketinput').clear().type(amazonS3BucketName);
        cy.get('#saveSetting').click().wait(TIMEOUTS.ONE_SEC);
        cy.get('#TestS3Connection').scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Test Connection').should('be.visible').click().wait(TIMEOUTS.ONE_SEC);
            waitForAlert('Connection unsuccessful: Unable to connect to S3. Verify your Amazon S3 connection authorization parameters and authentication settings.');
        });
    });
    it('MM-T963 - Configuration - Purge caches', () => {
        cy.visit('/admin_console/environment/web_server');
        cy.get('#PurgeButton').scrollIntoView().should('be.visible').within(() => {
            cy.findByText('Purge All Caches').should('be.visible').click().wait(TIMEOUTS.ONE_SEC);
        });
        cy.reload();
        cy.get('.admin-console', {timeout: TIMEOUTS.ONE_MIN}).should('be.visible').within(() => {
            cy.get('.admin-console__header').should('be.visible').and('have.text', 'Web Server');
        });
    });
    function waitForAlert(message) {
        cy.waitUntil(() => cy.get('.alert').scrollIntoView().should('be.visible').then((alert) => {
            return alert[0].innerText === message;
        }));
    }
});