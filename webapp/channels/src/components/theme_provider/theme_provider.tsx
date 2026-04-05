import React, {useEffect, useMemo, useState} from 'react';
import {useSelector} from 'react-redux';
import {Preferences} from 'mattermost-redux/constants';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {applyTheme} from 'utils/utils';
import type {GlobalState} from 'types/store';
import {ThemeContext} from './theme_context';
export default function ThemeProvider({children}: {children: React.ReactNode}) {
    const [usingUserTheme, setUsingUserTheme] = useState(0);
    const theme = useSelector((state: GlobalState) => {
        if (usingUserTheme > 0) {
            return getTheme(state);
        }
        return Preferences.THEMES.denim;
    });
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);
    const context = useMemo(() => ({
        startUsingUserTheme: () => setUsingUserTheme((count) => count + 1),
        stopUsingUserTheme: () => setUsingUserTheme((count) => count - 1),
    }), []);
    return (
        <ThemeContext.Provider value={context}>
            {children}
        </ThemeContext.Provider>
    );
}