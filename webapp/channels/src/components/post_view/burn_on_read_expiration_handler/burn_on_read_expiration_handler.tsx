import {useEffect} from 'react';
import {expirationScheduler} from 'utils/burn_on_read_expiration_scheduler';
interface Props {
    postId: string;
    expireAt?: number | null;
    maxExpireAt?: number | null;
}
const BurnOnReadExpirationHandler = ({postId, expireAt = null, maxExpireAt = null}: Props) => {
    useEffect(() => {
        expirationScheduler.registerPost(postId, expireAt, maxExpireAt);
        return () => {
            expirationScheduler.unregisterPost(postId);
        };
    }, [postId, expireAt, maxExpireAt]);
    return null;
};
export default BurnOnReadExpirationHandler;