import type {UserProfile} from './users';
export enum UserReportSortColumns {
    username = 'Username',
    email = 'Email',
    createAt = 'CreateAt',
    firstName = 'FirstName',
    lastName = 'LastName',
    nickname = 'Nickname',
}
export enum ReportSortDirection {
    ascending = 'asc',
    descending = 'desc',
}
export enum ReportDuration {
    AllTime = 'all_time',
    Last30Days = 'last_30_days',
    PreviousMonth = 'previous_month',
    Last6Months = 'last_6_months',
}
export enum GuestFilter {
    All = 'all',
    SingleChannel = 'single_channel',
    MultipleChannel = 'multi_channel',
}
export enum CursorPaginationDirection {
    'prev' = 'prev',
    'next' = 'next',
}
export type UserReportFilter = {
    role_filter?: string;
    has_no_team?: boolean;
    team_filter?: string;
    hide_active?: boolean;
    hide_inactive?: boolean;
    search_term?: string;
    guest_filter?: string;
}
export type UserReportOptions = UserReportFilter & {
    page_size?: number;
    sort_column?: UserReportSortColumns;
    sort_direction?: ReportSortDirection;
    direction?: CursorPaginationDirection;
    from_column_value?: string;
    from_id?: string;
    date_range?: ReportDuration;
};
export type UserReport = UserProfile & {
    last_login: number;
    last_status_at?: number;
    last_post_date?: number;
    days_active?: number;
    total_posts?: number;
    channel_count?: number;
}