declare namespace Cypress {
    interface Chainable {
        apiGetClusterStatus(): Chainable<{clusterInfo: ClusterInfo[]}>;
    }
}