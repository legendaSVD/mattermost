let createdCommand;
describe('Interactive Dialog - Date and DateTime Fields', () => {
    let testTeam;
    let testChannel;
    const openDateTimeDialog = (command = '') => {
        cy.postMessage(`/${createdCommand.trigger} ${command}`);
        cy.get('#appsModal').should('be.visible');
    };
    const openDatePicker = (formGroupName) => {
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', formGroupName).within(() => {
                cy.get('.date-time-input').click();
            });
        });
        cy.get('.rdp', {timeout: 5000}).should('be.visible');
    };
    const getSelectableDay = (daysFromToday = 2) => {
        const now = new Date();
        const today = now.getDate();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const targetDay = today + daysFromToday;
        if (targetDay <= lastDayOfMonth) {
            return {day: targetDay.toString(), needsNextMonth: false};
        }
        return {day: (targetDay - lastDayOfMonth).toString(), needsNextMonth: true};
    };
    const selectDateFromPicker = ({day, needsNextMonth = false}) => {
        if (needsNextMonth) {
            cy.get('.rdp .rdp-nav_button_next').click();
        }
        cy.get('.rdp').find('.rdp-day:not(.rdp-day_outside)').filter((i, el) => el.textContent.trim() === day).first().click();
    };
    const verifyModalTitle = (title) => {
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalLabel').should('be.visible').and('contain', title);
        });
    };
    const verifyFormGroup = (groupName, options = {}) => {
        const selector = options.scrollIntoView ?
            cy.contains('.form-group', groupName).scrollIntoView().should('be.visible') :
            cy.contains('.form-group', groupName).should('be.visible');
        return selector.within(() => {
            if (options.label) {
                cy.get('label').should('contain', options.label);
            }
            if (options.helpText) {
                cy.get('.help-text').should('contain', options.helpText);
            }
            if (options.inputSelector) {
                cy.get(options.inputSelector).should('be.visible');
            }
        });
    };
    before(() => {
        cy.requireWebhookServer();
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            testChannel = channel;
            const webhookBaseUrl = Cypress.env().webhookBaseUrl;
            const command = {
                auto_complete: false,
                description: 'Test for datetime dialog',
                display_name: 'DateTime Dialog',
                icon_url: '',
                method: 'P',
                team_id: team.id,
                trigger: 'datetime_dialog',
                url: `${webhookBaseUrl}/datetime_dialog_request`,
                username: '',
            };
            cy.apiCreateCommand(command).then(({data}) => {
                createdCommand = data;
                cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
            });
        });
    });
    beforeEach(() => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`);
        cy.get('#postListContent').should('be.visible');
        cy.get('#post_textbox').should('be.visible');
    });
    it('MM-T2530A - Date field UI and basic functionality', () => {
        openDateTimeDialog('basic');
        verifyModalTitle('DateTime Fields Test');
        verifyFormGroup('Event Date', {
            label: 'Event Date',
            helpText: 'Select the date for your event',
            inputSelector: '.date-time-input',
        });
        openDatePicker('Event Date');
        selectDateFromPicker(getSelectableDay());
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Event Date').within(() => {
                cy.get('.date-time-input__value').should('be.visible').and('not.be.empty');
            });
        });
    });
    it('MM-T2530B - DateTime field UI and functionality', () => {
        openDateTimeDialog();
        verifyFormGroup('Meeting Time', {
            label: 'Meeting Time',
            helpText: 'Select the date and time for your meeting',
            inputSelector: '.apps-form-datetime-input',
        });
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.apps-form-datetime-input').within(() => {
                    cy.get('.dateTime').should('be.visible');
                    cy.get('.dateTime__date').should('be.visible');
                    cy.get('.dateTime__time').should('be.visible');
                });
            });
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__date .date-time-input').click();
            });
        });
        cy.get('.rdp', {timeout: 5000}).should('be.visible');
        selectDateFromPicker(getSelectableDay(3));
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__time button[data-testid="time_button"]').click();
            });
        });
        cy.get('[id="expiryTimeMenu"]', {timeout: 10000}).should('be.visible');
        cy.get('[id^="time_option_"]').first().click();
    });
    it('MM-T2530C - Date field validation with min_date constraint', () => {
        openDateTimeDialog('mindate');
        verifyFormGroup('Future Date Only', {
            label: 'Future Date Only',
            helpText: 'Must be today or later',
        });
        openDatePicker('Future Date Only');
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 2);
        const needsPrevMonth = pastDate.getMonth() !== new Date().getMonth();
        if (needsPrevMonth) {
            cy.get('.rdp .rdp-nav_button_previous').click();
        }
        const pastDay = pastDate.getDate().toString();
        cy.get('.rdp').find('.rdp-day:not(.rdp-day_outside)')
            .filter((i, el) => el.textContent.trim() === pastDay)
            .should('have.class', 'rdp-day_disabled').and('be.disabled');
        const {day: futureDay, needsNextMonth} = getSelectableDay(2);
        if (needsPrevMonth) {
            cy.get('.rdp .rdp-nav_button_next').click();
        }
        if (needsNextMonth) {
            cy.get('.rdp .rdp-nav_button_next').click();
        }
        cy.get('.rdp').find('.rdp-day:not(.rdp-day_outside)')
            .filter((i, el) => el.textContent.trim() === futureDay)
            .should('not.have.class', 'rdp-day_disabled').and('not.be.disabled')
            .first().click();
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Future Date Only').within(() => {
                cy.get('.date-time-input__value').should('be.visible').and('not.be.empty');
            });
        });
    });
    it('MM-T2530D - DateTime field with custom time interval', () => {
        cy.get('#postListContent').should('be.visible');
        openDateTimeDialog('interval');
        verifyFormGroup('Custom Interval Time', {
            inputSelector: '.apps-form-datetime-input',
            scrollIntoView: true,
        });
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Custom Interval Time').within(() => {
                cy.get('.dateTime__time button[data-testid="time_button"]').click();
            });
        });
        cy.get('[id="expiryTimeMenu"]', {timeout: 10000}).should('be.visible');
        cy.get('[id^="time_option_"]').should('have.length.greaterThan', 0);
    });
    it('MM-T2530E - Form submission with date and datetime values', () => {
        openDateTimeDialog('basic');
        openDatePicker('Event Date');
        selectDateFromPicker(getSelectableDay());
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal', {timeout: 10000}).should('not.exist');
        cy.get('#postListContent', {timeout: 10000}).within(() => {
            cy.get('.post-message__text').last().should('contain', 'Form submitted successfully');
        });
    });
    it('MM-T2530F - Relative date values functionality', () => {
        openDateTimeDialog('relative');
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Relative Date Example').scrollIntoView().should('be.visible').within(() => {
                cy.get('.date-time-input__value').should('be.visible').and('not.be.empty');
            });
            cy.contains('.form-group', 'Relative DateTime Example').scrollIntoView().should('be.visible').within(() => {
                cy.get('.apps-form-datetime-input').should('not.be.empty');
            });
        });
    });
    it('MM-T2530G - Date field locale formatting', () => {
        cy.visit(`/${testTeam.name}/channels/${testChannel.name}`, {
            onBeforeLoad(win) {
                Object.defineProperty(win.navigator, 'language', {value: 'en-US'});
                Object.defineProperty(win.navigator, 'languages', {value: ['en-US', 'en']});
            },
        });
        openDateTimeDialog('basic');
        openDatePicker('Event Date');
        const selectedDay = getSelectableDay();
        selectDateFromPicker(selectedDay);
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Event Date').within(() => {
                cy.get('.date-time-input__value').should('be.visible').and('not.be.empty').invoke('text').then((text) => {
                    const match = text.trim().match(/^[A-Z][a-z]{2} (\d{1,2}), \d{4}$/);
                    expect(match, 'date format').to.not.be.null;
                    expect(Number(match[1]), 'selected day').to.equal(Number(selectedDay.day));
                });
            });
        });
    });
    it('MM-T2530H - DateTime field respects 12h/24h time preference', () => {
        cy.apiSaveClockDisplayModeTo24HourPreference(true);
        cy.reload();
        cy.get('#postListContent').should('be.visible');
        openDateTimeDialog();
        verifyFormGroup('Meeting Time', {
            inputSelector: '.apps-form-datetime-input',
        });
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__date .date-time-input').click();
            });
        });
        cy.get('.rdp', {timeout: 5000}).should('be.visible');
        selectDateFromPicker(getSelectableDay());
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__time button[data-testid="time_button"]').click();
            });
        });
        cy.get('[id="expiryTimeMenu"]', {timeout: 10000}).should('be.visible');
        cy.get('[id^="time_option_"]').first().invoke('text').then((text) => {
            expect(text).to.match(/^\d{2}:\d{2}$/);
        });
        cy.get('[id^="time_option_"]').eq(5).click();
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__time .date-time-input__value').invoke('text').then((text) => {
                    expect(text).to.match(/^\d{2}:\d{2}$/);
                });
            });
        });
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalCancel').click();
        });
        cy.apiSaveClockDisplayModeTo24HourPreference(false);
        cy.reload();
        cy.get('#postListContent').should('be.visible');
        openDateTimeDialog();
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__date .date-time-input').click();
            });
        });
        cy.get('.rdp').should('be.visible');
        selectDateFromPicker(getSelectableDay(3));
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Meeting Time').within(() => {
                cy.get('.dateTime__time button[data-testid="time_button"]').click();
            });
        });
        cy.get('[id="expiryTimeMenu"]').should('be.visible');
        cy.get('[id^="time_option_"]').first().invoke('text').then((text) => {
            expect(text).to.match(/\d{1,2}:\d{2} [AP]M/);
        });
    });
    it('MM-T2530O - Manual time entry (basic functionality)', () => {
        openDateTimeDialog('timezone-manual');
        verifyModalTitle('Timezone & Manual Entry Demo');
        verifyFormGroup('Your Local Time (Manual Entry)', {
            helpText: 'Type any time',
        });
        cy.get('#appsModal').within(() => {
            cy.contains('.form-group', 'Your Local Time (Manual Entry)').within(() => {
                cy.get('input#time_input').should('be.visible').type('3:45pm').blur();
            });
        });
        cy.contains('.form-group', 'Your Local Time (Manual Entry)').within(() => {
            cy.get('input#time_input').should('not.have.class', 'error');
            cy.get('input#time_input').should('have.value', '3:45 PM');
        });
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal', {timeout: 10000}).should('not.exist');
    });
    it('MM-T2530P - Manual time entry (multiple formats)', () => {
        openDateTimeDialog('timezone-manual');
        const testFormats = [
            {input: '12a', expected12h: '12:00 AM'},
            {input: '14:30', expected12h: '2:30 PM'},
            {input: '9pm', expected12h: '9:00 PM'},
        ];
        testFormats.forEach(({input, expected12h}) => {
            cy.contains('.form-group', 'Your Local Time (Manual Entry)').within(() => {
                cy.get('input#time_input').clear().type(input).blur();
                cy.wait(100);
                cy.get('input#time_input').invoke('val').should('equal', expected12h);
            });
        });
    });
    it('MM-T2530Q - Manual time entry (invalid format)', () => {
        openDateTimeDialog('timezone-manual');
        cy.contains('.form-group', 'Your Local Time (Manual Entry)').within(() => {
            cy.get('input#time_input').type('abc').blur();
            cy.get('input#time_input').should('have.class', 'error');
        });
        cy.contains('.form-group', 'Your Local Time (Manual Entry)').within(() => {
            cy.get('input#time_input').clear().type('2:30pm').blur();
            cy.get('input#time_input').should('not.have.class', 'error');
        });
    });
    it('MM-T2530R - Timezone support (dropdown)', function() {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTimezone === 'Europe/London' || userTimezone === 'GMT' || userTimezone.includes('London')) {
            this.skip();
        }
        openDateTimeDialog('timezone-manual');
        cy.contains('.form-group', 'London Office Hours (Dropdown)').within(() => {
            cy.contains('Times in GMT').should('be.visible');
        });
        cy.contains('.form-group', 'London Office Hours (Dropdown)').within(() => {
            cy.get('.dateTime__date .date-time-input').click();
        });
        cy.get('.rdp').should('be.visible');
        selectDateFromPicker(getSelectableDay());
        cy.contains('.form-group', 'London Office Hours (Dropdown)').within(() => {
            cy.get('.dateTime__time button[data-testid="time_button"]').click();
        });
        cy.get('[id="expiryTimeMenu"]').should('be.visible');
        cy.get('[id^="time_option_"]').first().invoke('text').then((text) => {
            expect(text).to.match(/^(12:00 AM|00:00)$/);
        });
        cy.get('[id^="time_option_"]').eq(5).click();
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal', {timeout: 10000}).should('not.exist');
    });
    it('MM-T2530S - Timezone support (manual entry)', function() {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTimezone === 'Europe/London' || userTimezone === 'GMT' || userTimezone.includes('London')) {
            this.skip();
        }
        openDateTimeDialog('timezone-manual');
        cy.contains('.form-group', 'London Office Hours (Manual Entry)').within(() => {
            cy.contains('Times in GMT').should('be.visible');
        });
        cy.contains('.form-group', 'London Office Hours (Manual Entry)').within(() => {
            cy.get('.dateTime__date .date-time-input').click();
        });
        cy.get('.rdp').should('be.visible');
        selectDateFromPicker(getSelectableDay());
        cy.contains('.form-group', 'London Office Hours (Manual Entry)').within(() => {
            cy.get('input#time_input').clear().type('2:30pm').blur();
            cy.get('input#time_input').should('not.have.class', 'error');
        });
        cy.get('#appsModal').within(() => {
            cy.get('#appsModalSubmit').click();
        });
        cy.get('#appsModal', {timeout: 10000}).should('not.exist');
    });
});