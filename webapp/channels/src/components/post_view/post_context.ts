import React from 'react';
interface PostContextValue {
    handlePopupOpened: ((opened: boolean) => void) | null;
}
const PostContext = React.createContext<PostContextValue>({
    handlePopupOpened: null,
});
export default PostContext;