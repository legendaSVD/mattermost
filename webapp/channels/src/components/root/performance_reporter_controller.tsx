import {useEffect, useRef} from 'react';
import {useStore} from 'react-redux';
import {Client4} from 'mattermost-redux/client';
import DesktopAppAPI from 'utils/desktop_api';
import PerformanceReporter from 'utils/performance_telemetry/reporter';
import type {GlobalState} from 'types/store';
export default function PerformanceReporterController() {
    const store = useStore<GlobalState>();
    const reporter = useRef<PerformanceReporter>();
    useEffect(() => {
        reporter.current = new PerformanceReporter(Client4, store, DesktopAppAPI);
        reporter.current.observe();
        return () => {
            console.error('PerformanceReporterController - Component unmounted or store changed');
        };
    }, [store]);
    return null;
}