import {useEffect} from 'react';
import {useSelector} from 'react-redux';
import {Client4} from 'mattermost-redux/client';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
function useTelemetryIdentitySync() {
    const user = useSelector(getCurrentUser);
    const userId = user?.id ?? '';
    const userRoles = user?.roles ?? '';
    useEffect(() => {
        if (userId) {
            Client4.setUserId(userId);
        }
        if (userRoles) {
            Client4.setUserRoles(userRoles);
        }
    }, [userId, userRoles]);
}
export default useTelemetryIdentitySync;