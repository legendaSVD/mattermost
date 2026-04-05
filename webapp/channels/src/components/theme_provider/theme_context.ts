import React, {useContext, useEffect} from 'react';
export const ThemeContext = React.createContext({
    startUsingUserTheme: () => {},
    stopUsingUserTheme: () => {},
});
export function useUserTheme() {
    const context = useContext(ThemeContext);
    useEffect(() => {
        context.startUsingUserTheme();
        return () => {
            context.stopUsingUserTheme();
        };
    }, [context]);
}
export function WithUserTheme({children}: {children: React.ReactNode}) {
    useUserTheme();
    return children;
}