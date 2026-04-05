import classNames from 'classnames';
import React, {useRef} from 'react';
import type {ScheduledPost} from '@mattermost/types/schedule_post';
import type {UserProfile, UserStatus} from '@mattermost/types/users';
import DraftRow from 'components/drafts/draft_row';
import {useQuery} from 'utils/http_utils';
type Props = {
    scheduledPosts: ScheduledPost[];
    currentUser: UserProfile;
    userDisplayName: string;
    userStatus: UserStatus['status'];
}
export default function NonVirtualizedScheduledPostList(props: Props) {
    const query = useQuery();
    const targetId = query.get('target_id');
    const targetScheduledPostId = useRef<string>();
    return (
        <>
            {
                props.scheduledPosts.map((scheduledPost, index) => {
                    const isInTargetChannelOrThread = scheduledPost.channel_id === targetId || scheduledPost.root_id === targetId;
                    const hasError = Boolean(scheduledPost.error_code);
                    const scrollIntoView = !targetScheduledPostId.current && (isInTargetChannelOrThread && !hasError);
                    if (scrollIntoView) {
                        targetScheduledPostId.current = scheduledPost.id;
                    }
                    return (
                        <DraftRow
                            key={scheduledPost.id}
                            item={scheduledPost}
                            displayName={props.userDisplayName}
                            status={props.userStatus}
                            user={props.currentUser}
                            scrollIntoView={targetScheduledPostId.current === scheduledPost.id}
                            containerClassName={classNames('nonVirtualizedScheduledPostRow', {firstRow: index === 0})}
                        />
                    );
                })
            }
        </>
    );
}