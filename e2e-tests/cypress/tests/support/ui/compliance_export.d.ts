declare namespace Cypress {
    interface Chainable {
        uiEnableComplianceExport(exportFormat: string): Chainable;
        uiGoToCompliancePage(): Chainable;
        uiExportCompliance(): Chainable;
    }
}