import React from 'react';
import {FormattedMessage} from 'react-intl';
import {Link} from 'react-router-dom';
import type {Bot as BotType} from '@mattermost/types/bots';
import type {Team} from '@mattermost/types/teams';
import type {UserProfile, UserAccessToken} from '@mattermost/types/users';
import type {RelationOneToOne} from '@mattermost/types/utilities';
import type {ActionResult} from 'mattermost-redux/types/actions';
import BackstageList from 'components/backstage/components/backstage_list';
import ExternalLink from 'components/external_link';
import Constants from 'utils/constants';
import * as Utils from 'utils/utils';
import Bot, {matchesFilter} from './bot';
type Props = {
    bots: Record<string, BotType>;
    appsBotIDs: string[];
    appsEnabled: boolean;
    accessTokens?: RelationOneToOne<UserProfile, Record<string, UserAccessToken>>;
    owners: Record<string, UserProfile>;
    users: Record<string, UserProfile>;
    createBots?: boolean;
    actions: {
        loadBots: (page?: number, perPage?: number) => Promise<ActionResult<BotType[]>>;
        getUserAccessTokensForUser: (userId: string, page?: number, perPage?: number) => void;
        createUserAccessToken: (userId: string, description: string) => Promise<ActionResult<UserAccessToken>>;
        revokeUserAccessToken: (tokenId: string) => Promise<ActionResult>;
        enableUserAccessToken: (tokenId: string) => Promise<ActionResult>;
        disableUserAccessToken: (tokenId: string) => Promise<ActionResult>;
        getUser: (userId: string) => void;
        disableBot: (userId: string) => Promise<ActionResult>;
        enableBot: (userId: string) => Promise<ActionResult>;
        fetchAppsBotIDs: () => Promise<ActionResult>;
    };
    team: Team;
}
type State = {
    loading: boolean;
}
export default class Bots extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            loading: true,
        };
    }
    public componentDidMount(): void {
        this.props.actions.loadBots(
            Constants.Integrations.START_PAGE_NUM,
            Constants.Integrations.PAGE_SIZE,
        ).then(
            (result) => {
                if (result.data) {
                    const promises = [];
                    for (const bot of result.data) {
                        this.props.actions.getUser(bot.owner_id);
                        promises.push(this.props.actions.getUser(bot.user_id));
                        promises.push(this.props.actions.getUserAccessTokensForUser(bot.user_id));
                    }
                    Promise.all(promises).then(() => {
                        this.setState({loading: false});
                    });
                }
            },
        );
        if (this.props.appsEnabled) {
            this.props.actions.fetchAppsBotIDs();
        }
    }
    DisabledSection(props: {hasDisabled: boolean; disabledBots: JSX.Element[]; filter?: string}): JSX.Element | null {
        if (!props.hasDisabled) {
            return null;
        }
        const botsToDisplay = React.Children.map(props.disabledBots, (child) => {
            return React.cloneElement(child, {filter: props.filter});
        });
        return (
            <>
                <div className='bot-disabled'>
                    <FormattedMessage
                        id='bots.disabled'
                        defaultMessage='Disabled'
                    />
                </div>
                <div className='bot-list__disabled'>
                    {botsToDisplay}
                </div>
            </>
        );
    }
    EnabledSection(props: {enabledBots: JSX.Element[]; filter?: string}): JSX.Element {
        const botsToDisplay = React.Children.map(props.enabledBots, (child) => {
            return React.cloneElement(child, {filter: props.filter});
        });
        return (
            <div>
                {botsToDisplay}
            </div>
        );
    }
    botToJSX = (bot: BotType): JSX.Element => {
        return (
            <Bot
                key={bot.user_id}
                bot={bot}
                owner={this.props.owners[bot.user_id]}
                user={this.props.users[bot.user_id]}
                accessTokens={(this.props.accessTokens && this.props.accessTokens[bot.user_id]) || {}}
                actions={this.props.actions}
                team={this.props.team}
                fromApp={this.props.appsBotIDs.includes(bot.user_id)}
            />
        );
    };
    bots = (filter?: string): [JSX.Element[], boolean] => {
        const bots = Object.values(this.props.bots).sort((a, b) => a.username.localeCompare(b.username));
        const match = (bot: BotType) => matchesFilter(bot, filter, this.props.owners[bot.user_id]);
        const enabledBots = bots.filter((bot) => bot.delete_at === 0).filter(match).map(this.botToJSX);
        const disabledBots = bots.filter((bot) => bot.delete_at > 0).filter(match).map(this.botToJSX);
        const sections = [(
            <div key='sections'>
                <this.EnabledSection
                    enabledBots={enabledBots}
                />
                <this.DisabledSection
                    hasDisabled={disabledBots.length > 0}
                    disabledBots={disabledBots}
                />
            </div>
        )];
        return [sections, enabledBots.length > 0 || disabledBots.length > 0];
    };
    public render(): JSX.Element {
        return (
            <BackstageList
                header={
                    <FormattedMessage
                        id='bots.manage.header'
                        defaultMessage='Bot Accounts'
                    />
                }
                addText={this.props.createBots &&
                    <FormattedMessage
                        id='bots.manage.add'
                        defaultMessage='Add Bot Account'
                    />
                }
                addLink={'/' + this.props.team.name + '/integrations/bots/add'}
                addButtonId='addBotAccount'
                emptyText={
                    <FormattedMessage
                        id='bots.manage.empty'
                        defaultMessage='No bot accounts found'
                    />
                }
                emptyTextSearch={
                    <FormattedMessage
                        id='bots.emptySearch'
                        defaultMessage='No bot accounts match <b>{searchTerm}</b>'
                        values={{
                            b: (chunks) => <b>{chunks}</b>,
                        }}
                    />
                }
                helpText={
                    <>
                        <FormattedMessage
                            id='bots.manage.help1'
                            defaultMessage='Use {botAccounts} to integrate with Mattermost through plugins or the API. Bot accounts are available to everyone on your server. '
                            values={{
                                botAccounts: (
                                    <ExternalLink
                                        href='https://mattermost.com/pl/default-bot-accounts'
                                        location='bots'
                                    >
                                        <FormattedMessage
                                            id='bots.manage.bot_accounts'
                                            defaultMessage='Bot Accounts'
                                        />
                                    </ExternalLink>
                                ),
                            }}
                        />
                        <FormattedMessage
                            id='bots.help2'
                            defaultMessage={'Enable bot account creation in the <a>System Console</a>.'}
                            values={{
                                a: (chunks) => <Link to='/admin_console/integrations/bot_accounts'>{chunks}</Link>,
                            }}
                        />
                    </>
                }
                searchPlaceholder={Utils.localizeMessage({id: 'bots.manage.search', defaultMessage: 'Search Bot Accounts'})}
                loading={this.state.loading}
            >
                {this.bots}
            </BackstageList>
        );
    }
}