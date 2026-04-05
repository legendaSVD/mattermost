import React, {useCallback} from 'react';
import {useSelector} from 'react-redux';
import {getChannelsNameMapInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentRelativeTeamUrl, getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';
import Markdown from 'components/markdown';
import {handleFormattedTextClick} from 'utils/utils';
type Props = {
    text: string;
    className?: string;
};
const RecapTextFormatter = ({text, className}: Props) => {
    const channelNamesMap = useSelector(getChannelsNameMapInCurrentTeam);
    const currentTeam = useSelector(getCurrentTeam);
    const currentRelativeTeamUrl = useSelector(getCurrentRelativeTeamUrl);
    const cleanText = text.replace(/<[^>]*>/g, '');
    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        handleFormattedTextClick(e, currentRelativeTeamUrl);
    }, [currentRelativeTeamUrl]);
    return (
        <div
            className={className}
            onClick={handleClick}
        >
            {}
            <Markdown
                message={cleanText}
                channelNamesMap={channelNamesMap}
                options={{
                    atMentions: true,
                    markdown: false,
                    singleline: false,
                    mentionHighlight: false,
                    team: currentTeam,
                }}
            />
        </div>
    );
};
export default RecapTextFormatter;