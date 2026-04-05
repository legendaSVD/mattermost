package api4
import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
func (api *API) InitReports() {
	api.BaseRoutes.Reports.Handle("/users", api.APISessionRequired(getUsersForReporting)).Methods(http.MethodGet)
	api.BaseRoutes.Reports.Handle("/users/count", api.APISessionRequired(getUserCountForReporting)).Methods(http.MethodGet)
	api.BaseRoutes.Reports.Handle("/users/export", api.APISessionRequired(startUsersBatchExport)).Methods(http.MethodPost)
	api.BaseRoutes.Reports.Handle("/posts", api.APISessionRequired(getPostsForReporting)).Methods(http.MethodPost)
}
func getUsersForReporting(c *Context, w http.ResponseWriter, r *http.Request) {
	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionSysconsoleReadUserManagementUsers) {
		c.SetPermissionError(model.PermissionSysconsoleReadUserManagementUsers)
		return
	}
	baseOptions := fillReportingBaseOptions(r.URL.Query())
	options, err := fillUserReportOptions(r.URL.Query())
	if err != nil {
		c.Err = err
		return
	}
	options.ReportingBaseOptions = baseOptions
	if options.PageSize <= 0 || options.PageSize > model.ReportingMaxPageSize {
		c.Err = model.NewAppError("getUsersForReporting", "api.getUsersForReporting.invalid_page_size", nil, "", http.StatusBadRequest)
		return
	}
	userReports, err := c.App.GetUsersForReporting(options)
	if err != nil {
		c.Err = err
		return
	}
	if jsonErr := json.NewEncoder(w).Encode(userReports); jsonErr != nil {
		c.Logger.Warn("Error writing response", mlog.Err(jsonErr))
	}
}
func getUserCountForReporting(c *Context, w http.ResponseWriter, r *http.Request) {
	if !c.App.SessionHasPermissionTo(*c.AppContext.Session(), model.PermissionSysconsoleReadUserManagementUsers) {
		c.SetPermissionError(model.PermissionSysconsoleReadUserManagementUsers)
		return
	}
	options, err := fillUserReportOptions(r.URL.Query())
	if err != nil {
		c.Err = err
		return
	}
	count, err := c.App.GetUserCountForReport(options)
	if err != nil {
		c.Err = err
		return
	}
	if jsonErr := json.NewEncoder(w).Encode(count); jsonErr != nil {
		c.Logger.Warn("Error writing response", mlog.Err(jsonErr))
	}
}
func startUsersBatchExport(c *Context, w http.ResponseWriter, r *http.Request) {
	if !(c.IsSystemAdmin()) {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}
	baseOptions := fillReportingBaseOptions(r.URL.Query())
	options, err := fillUserReportOptions(r.URL.Query())
	if err != nil {
		c.Err = err
		return
	}
	options.ReportingBaseOptions = baseOptions
	dateRange := options.ReportingBaseOptions.DateRange
	if dateRange == "" {
		dateRange = "all_time"
	}
	startAt, endAt := model.GetReportDateRange(dateRange, time.Now())
	if err := c.App.StartUsersBatchExport(c.AppContext, options, startAt, endAt); err != nil {
		c.Err = err
		return
	}
	ReturnStatusOK(w)
}
func fillReportingBaseOptions(values url.Values) model.ReportingBaseOptions {
	sortColumn := "Username"
	if values.Get("sort_column") != "" {
		sortColumn = values.Get("sort_column")
	}
	direction := "next"
	if values.Get("direction") == "prev" {
		direction = "prev"
	}
	pageSize := 50
	if pageSizeStr, err := strconv.ParseInt(values.Get("page_size"), 10, 64); err == nil {
		pageSize = int(pageSizeStr)
	}
	options := model.ReportingBaseOptions{
		Direction:       direction,
		SortColumn:      sortColumn,
		SortDesc:        values.Get("sort_direction") == "desc",
		PageSize:        pageSize,
		FromColumnValue: values.Get("from_column_value"),
		FromId:          values.Get("from_id"),
		DateRange:       values.Get("date_range"),
	}
	options.PopulateDateRange(time.Now())
	return options
}
func fillUserReportOptions(values url.Values) (*model.UserReportOptions, *model.AppError) {
	teamFilter := values.Get("team_filter")
	if !(teamFilter == "" || model.IsValidId(teamFilter)) {
		return nil, model.NewAppError("getUsersForReporting", "api.getUsersForReporting.invalid_team_filter", nil, "", http.StatusBadRequest)
	}
	hideActive := values.Get("hide_active") == "true"
	hideInactive := values.Get("hide_inactive") == "true"
	if hideActive && hideInactive {
		return nil, model.NewAppError("getUsersForReporting", "api.getUsersForReporting.invalid_active_filter", nil, "", http.StatusBadRequest)
	}
	return &model.UserReportOptions{
		Team:         teamFilter,
		Role:         values.Get("role_filter"),
		HasNoTeam:    values.Get("has_no_team") == "true",
		HideActive:   hideActive,
		HideInactive: hideInactive,
		SearchTerm:   values.Get("search_term"),
		GuestFilter:  values.Get("guest_filter"),
	}, nil
}
func getPostsForReporting(c *Context, w http.ResponseWriter, r *http.Request) {
	if !c.IsSystemAdmin() {
		c.SetPermissionError(model.PermissionManageSystem)
		return
	}
	var request struct {
		model.ReportPostOptions
		model.ReportPostOptionsCursor
	}
	if jsonErr := json.NewDecoder(r.Body).Decode(&request); jsonErr != nil {
		c.SetInvalidParamWithErr("body", jsonErr)
		return
	}
	var queryParams *model.ReportPostQueryParams
	var appErr *model.AppError
	if request.Cursor != "" {
		queryParams, appErr = model.DecodeReportPostCursorV1(request.Cursor)
		if appErr != nil {
			c.Err = appErr
			return
		}
	} else {
		timeField := model.ReportingTimeFieldCreateAt
		if request.TimeField == model.ReportingTimeFieldUpdateAt {
			timeField = model.ReportingTimeFieldUpdateAt
		}
		sortDirection := model.ReportingSortDirectionAsc
		if request.SortDirection == model.ReportingSortDirectionDesc {
			sortDirection = model.ReportingSortDirectionDesc
		}
		cursorTime := int64(0)
		if request.StartTime > 0 {
			cursorTime = request.StartTime
		} else if sortDirection == model.ReportingSortDirectionDesc {
			cursorTime = math.MaxInt64
		}
		queryParams = &model.ReportPostQueryParams{
			ChannelId:          request.ChannelId,
			CursorTime:         cursorTime,
			CursorId:           "",
			TimeField:          timeField,
			SortDirection:      sortDirection,
			IncludeDeleted:     request.IncludeDeleted,
			ExcludeSystemPosts: request.ExcludeSystemPosts,
		}
	}
	if request.PerPage <= 0 {
		queryParams.PerPage = 100
	} else if request.PerPage > model.MaxReportingPerPage {
		queryParams.PerPage = model.MaxReportingPerPage
	} else {
		queryParams.PerPage = request.PerPage
	}
	if appErr = queryParams.Validate(); appErr != nil {
		c.Err = appErr
		return
	}
	response, appErr := c.App.GetPostsForReporting(c.AppContext, *queryParams, request.IncludeMetadata)
	if appErr != nil {
		c.Err = appErr
		return
	}
	if len(response.Posts) == 0 {
		channel, appErr := c.App.GetChannel(c.AppContext, request.ChannelId)
		if appErr != nil {
			c.Err = appErr
			return
		}
		if channel == nil {
			c.Err = model.NewAppError("getPostsForReporting", "api.post.get_posts_for_reporting.channel_not_found", nil, fmt.Sprintf("channel_id=%s", request.ChannelId), http.StatusNotFound)
			return
		}
	}
	if jsonErr := json.NewEncoder(w).Encode(response); jsonErr != nil {
		c.Logger.Warn("Error writing response", mlog.Err(jsonErr))
	}
}