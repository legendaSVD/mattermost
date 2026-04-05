declare namespace Cypress {
    interface Chainable {
        apiGetClientLicense(): Chainable<ClientLicense>;
        apiRequireLicenseForFeature(...features: string[]): Chainable<ClientLicense>;
        apiRequireLicense(): Chainable<ClientLicense>;
        apiUploadLicense(filePath: string): Chainable<Response>;
        apiInstallTrialLicense(): Chainable<Record<string, any>>;
        apiDeleteLicense(): Chainable<Response>;
        apiUpdateConfig(newConfig: DeepPartial<AdminConfig>): Chainable<{config: AdminConfig}>;
        apiReloadConfig(): Chainable<AdminConfig>;
        apiGetConfig(): Chainable<{config: AdminConfig}>;
        apiGetAnalytics(): Chainable<AnalyticsRow[]>;
        apiInvalidateCache(): Chainable<Record<string, any>>;
        shouldHaveElasticsearchDisabled(): Chainable;
        shouldNotRunOnCloudEdition(): Chainable;
        shouldRunOnTeamEdition(): Chainable;
        shouldHavePluginUploadEnabled(): Chainable;
        shouldRunWithSubpath(): Chainable;
        shouldHaveFeatureFlag(feature: string, expectedValue: any): Chainable;
        shouldHaveEmailEnabled(): Chainable;
    }
}