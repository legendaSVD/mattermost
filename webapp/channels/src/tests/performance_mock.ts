import {PerformanceObserver as NodePerformanceObserver, performance as nodePerformance} from 'node:perf_hooks';
Object.defineProperty(window, 'performance', {
    writable: true,
    value: nodePerformance,
});
Object.defineProperty(global, 'PerformanceObserver', {
    value: NodePerformanceObserver,
});
Object.defineProperty(PerformanceObserver, 'supportedEntryTypes', {
    value: [...PerformanceObserver.supportedEntryTypes, 'longtask'],
});
export function waitForObservations() {
    return new Promise((resolve) => setTimeout(resolve));
}