import React, {memo} from 'react';
import type {AppBinding} from '@mattermost/types/apps';
import type {Post} from '@mattermost/types/posts';
import type {TextFormattingOptions} from 'utils/text_formatting';
import EmbeddedBinding from './embedded_binding';
type Props = {
    post: Post;
    embeds: AppBinding[];
    options?: Partial<TextFormattingOptions>;
}
const EmbeddedBindings = ({
    embeds,
    post,
    options,
}: Props) => (
    <div
        id={`messageAttachmentList_${post.id}`}
        className='attachment__list'
    >
        {embeds.map((embed, i) => (
            <EmbeddedBinding
                embed={embed}
                post={post}
                key={'att_' + i}
                options={options}
            />
        ))}
    </div>
);
export default memo(EmbeddedBindings);