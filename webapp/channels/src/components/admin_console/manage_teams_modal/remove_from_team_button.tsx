import React from 'react';
import {FormattedMessage} from 'react-intl';
type Props = {
    teamId: string;
    handleRemoveUserFromTeam: (team: string) => void;
}
const RemoveFromTeamButton = ({teamId, handleRemoveUserFromTeam}: Props) => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        handleRemoveUserFromTeam(teamId);
    };
    return (
        <button
            type='button'
            className='btn btn-danger'
            onClick={handleClick}
        >
            <FormattedMessage
                id='team_members_dropdown.leave_team'
                defaultMessage='Remove from Team'
            />
        </button>
    );
};
export default RemoveFromTeamButton;