import classNames from 'classnames';
import React from 'react';
import {injectIntl} from 'react-intl';
import type {IntlShape} from 'react-intl';
import type {Team} from '@mattermost/types/teams';
import {imageURLForTeam} from 'utils/utils';
import './team_icon.scss';
type Props = {
    url?: string | null;
    content: React.ReactNode;
    size?: 'sm' | 'lg' | 'xsm' | 'xxs';
    withHover?: boolean;
    className?: string;
    intl: IntlShape;
};
export class TeamIcon extends React.PureComponent<Props> {
    public static defaultProps = {
        size: 'sm' as const,
    };
    public render() {
        const {content, url, size, withHover, className} = this.props;
        const hoverCss = withHover ? '' : 'no-hover';
        const {formatMessage} = this.props.intl;
        const teamIconUrl = url || imageURLForTeam({display_name: content} as Team);
        let icon;
        if (typeof content === 'string') {
            if (teamIconUrl) {
                icon = (
                    <div
                        data-testid='teamIconImage'
                        className={`TeamIcon__image TeamIcon__${size}`}
                        aria-label={
                            formatMessage({
                                id: 'sidebar.team_menu.button.teamImage',
                                defaultMessage: '{teamName} Team Image',
                            }, {
                                teamName: content,
                            })
                        }
                        style={{backgroundImage: `url('${teamIconUrl}')`}}
                        role={'img'}
                    />
                );
            } else {
                icon = (
                    <div
                        data-testid='teamIconInitial'
                        className={`TeamIcon__initials TeamIcon__initials__${size}`}
                        aria-label={
                            formatMessage({
                                id: 'sidebar.team_menu.button.teamInitials',
                                defaultMessage: '{teamName} Team Initials',
                            }, {
                                teamName: content,
                            })
                        }
                        role={'img'}
                    >
                        {content ? content.replace(/\s/g, '').substring(0, 2) : '??'}
                    </div>
                );
            }
        } else {
            icon = content;
        }
        return (
            <div className={classNames(`TeamIcon TeamIcon__${size}`, {withImage: teamIconUrl}, className, hoverCss)}>
                <div className={`TeamIcon__content ${hoverCss}`}>
                    {icon}
                </div>
            </div>
        );
    }
}
export default injectIntl(TeamIcon);