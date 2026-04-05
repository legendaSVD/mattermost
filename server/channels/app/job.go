package app
import (
	"errors"
	"net/http"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
func (a *App) getChannelIDFromJobData(jobData model.StringMap) string {
	policyID, ok := jobData["policy_id"]
	if !ok || policyID == "" {
		return ""
	}
	return policyID
}
func (a *App) GetJob(rctx request.CTX, id string) (*model.Job, *model.AppError) {
	job, err := a.Srv().Store().Job().Get(rctx, id)
	if err != nil {
		var nfErr *store.ErrNotFound
		switch {
		case errors.As(err, &nfErr):
			return nil, model.NewAppError("GetJob", "app.job.get.app_error", nil, "", http.StatusNotFound).Wrap(err)
		default:
			return nil, model.NewAppError("GetJob", "app.job.get.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
	}
	return job, nil
}
func (a *App) GetJobsByTypePage(rctx request.CTX, jobType string, page int, perPage int) ([]*model.Job, *model.AppError) {
	jobs, err := a.Srv().Store().Job().GetAllByTypePage(rctx, jobType, page, perPage)
	if err != nil {
		return nil, model.NewAppError("GetJobsByType", "app.job.get_all.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return jobs, nil
}
func (a *App) GetJobsByTypesPage(rctx request.CTX, jobType []string, page int, perPage int) ([]*model.Job, *model.AppError) {
	jobs, err := a.Srv().Store().Job().GetAllByTypesPage(rctx, jobType, page, perPage)
	if err != nil {
		return nil, model.NewAppError("GetJobsByType", "app.job.get_all.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return jobs, nil
}
func (a *App) GetJobsByTypesAndStatuses(rctx request.CTX, jobTypes []string, status []string, page int, perPage int) ([]*model.Job, *model.AppError) {
	jobs, err := a.Srv().Store().Job().GetAllByTypesAndStatusesPage(rctx, jobTypes, status, page*perPage, perPage)
	if err != nil {
		return nil, model.NewAppError("GetAllByTypesAndStatusesPage", "app.job.get_all.app_error", nil, "", http.StatusInternalServerError).Wrap(err)
	}
	return jobs, nil
}
func (a *App) CreateJob(rctx request.CTX, job *model.Job) (*model.Job, *model.AppError) {
	switch job.Type {
	case model.JobTypeAccessControlSync:
		return a.CreateAccessControlSyncJob(rctx, job.Data)
	default:
		return a.Srv().Jobs.CreateJob(rctx, job.Type, job.Data)
	}
}
func (a *App) CreateAccessControlSyncJob(rctx request.CTX, jobData map[string]string) (*model.Job, *model.AppError) {
	policyID, exists := jobData["policy_id"]
	if exists && policyID != "" {
		existingJobs, err := a.Srv().Store().Job().GetByTypeAndData(rctx, model.JobTypeAccessControlSync, map[string]string{
			"policy_id": policyID,
		}, true, model.JobStatusPending, model.JobStatusInProgress)
		if err != nil {
			return nil, model.NewAppError("CreateAccessControlSyncJob", "app.job.get_existing_jobs.error", nil, "", http.StatusInternalServerError).Wrap(err)
		}
		for _, job := range existingJobs {
			rctx.Logger().Info("Canceling existing access control sync job before creating new one",
				mlog.String("job_id", job.Id),
				mlog.String("policy_id", policyID),
				mlog.String("status", job.Status))
			if err := a.Srv().Jobs.SetJobCanceled(job); err != nil {
				rctx.Logger().Warn("Failed to cancel existing access control sync job",
					mlog.String("job_id", job.Id),
					mlog.String("policy_id", policyID),
					mlog.Err(err))
			}
		}
	}
	return a.Srv().Jobs.CreateJob(rctx, model.JobTypeAccessControlSync, jobData)
}
func (a *App) CancelJob(rctx request.CTX, jobId string) *model.AppError {
	return a.Srv().Jobs.RequestCancellation(rctx, jobId)
}
func (a *App) UpdateJobStatus(rctx request.CTX, job *model.Job, newStatus string) *model.AppError {
	switch newStatus {
	case model.JobStatusPending:
		return a.Srv().Jobs.SetJobPending(job)
	case model.JobStatusCancelRequested:
		return a.Srv().Jobs.RequestCancellation(rctx, job.Id)
	case model.JobStatusCanceled:
		return a.Srv().Jobs.SetJobCanceled(job)
	default:
		return model.NewAppError("UpdateJobStatus", "app.job.update_status.app_error", nil, "", http.StatusInternalServerError)
	}
}
func (a *App) SessionHasPermissionToCreateJob(session model.Session, job *model.Job) (bool, *model.Permission) {
	switch job.Type {
	case model.JobTypeDataRetention:
		return a.SessionHasPermissionTo(session, model.PermissionCreateDataRetentionJob), model.PermissionCreateDataRetentionJob
	case model.JobTypeMessageExport:
		return a.SessionHasPermissionTo(session, model.PermissionCreateComplianceExportJob), model.PermissionCreateComplianceExportJob
	case model.JobTypeElasticsearchPostIndexing:
		return a.SessionHasPermissionTo(session, model.PermissionCreateElasticsearchPostIndexingJob), model.PermissionCreateElasticsearchPostIndexingJob
	case model.JobTypeElasticsearchPostAggregation:
		return a.SessionHasPermissionTo(session, model.PermissionCreateElasticsearchPostAggregationJob), model.PermissionCreateElasticsearchPostAggregationJob
	case model.JobTypeLdapSync:
		return a.SessionHasPermissionTo(session, model.PermissionCreateLdapSyncJob), model.PermissionCreateLdapSyncJob
	case
		model.JobTypeMigrations,
		model.JobTypePlugins,
		model.JobTypeProductNotices,
		model.JobTypeExpiryNotify,
		model.JobTypeActiveUsers,
		model.JobTypeImportProcess,
		model.JobTypeImportDelete,
		model.JobTypeExportProcess,
		model.JobTypeExportDelete,
		model.JobTypeCloud,
		model.JobTypeExtractContent:
		return a.SessionHasPermissionTo(session, model.PermissionManageJobs), model.PermissionManageJobs
	case model.JobTypeAccessControlSync:
		hasSystemPermission := a.SessionHasPermissionTo(session, model.PermissionManageSystem)
		if hasSystemPermission {
			return true, model.PermissionManageSystem
		}
		channelID := a.getChannelIDFromJobData(job.Data)
		if channelID != "" {
			hasChannelPermission, _ := a.HasPermissionToChannel(request.EmptyContext(a.Srv().Log()), session.UserId, channelID, model.PermissionManageChannelAccessRules)
			if hasChannelPermission {
				return true, model.PermissionManageChannelAccessRules
			}
		}
		return false, model.PermissionManageSystem
	}
	return false, nil
}
func (a *App) SessionHasPermissionToManageJob(session model.Session, job *model.Job) (bool, *model.Permission) {
	var permission *model.Permission
	switch job.Type {
	case model.JobTypeDataRetention:
		permission = model.PermissionManageDataRetentionJob
	case model.JobTypeMessageExport:
		permission = model.PermissionManageComplianceExportJob
	case model.JobTypeElasticsearchPostIndexing:
		permission = model.PermissionManageElasticsearchPostIndexingJob
	case model.JobTypeElasticsearchPostAggregation:
		permission = model.PermissionManageElasticsearchPostAggregationJob
	case model.JobTypeLdapSync:
		permission = model.PermissionManageLdapSyncJob
	case
		model.JobTypeMigrations,
		model.JobTypePlugins,
		model.JobTypeProductNotices,
		model.JobTypeExpiryNotify,
		model.JobTypeActiveUsers,
		model.JobTypeImportProcess,
		model.JobTypeImportDelete,
		model.JobTypeExportProcess,
		model.JobTypeExportDelete,
		model.JobTypeCloud,
		model.JobTypeExtractContent:
		permission = model.PermissionManageJobs
	case model.JobTypeAccessControlSync:
		permission = model.PermissionManageSystem
	}
	if permission == nil {
		return false, nil
	}
	return a.SessionHasPermissionTo(session, permission), permission
}
func (a *App) SessionHasPermissionToReadJob(session model.Session, jobType string) (bool, *model.Permission) {
	switch jobType {
	case model.JobTypeDataRetention:
		return a.SessionHasPermissionTo(session, model.PermissionReadDataRetentionJob), model.PermissionReadDataRetentionJob
	case model.JobTypeMessageExport:
		return a.SessionHasPermissionTo(session, model.PermissionReadComplianceExportJob), model.PermissionReadComplianceExportJob
	case model.JobTypeElasticsearchPostIndexing:
		return a.SessionHasPermissionTo(session, model.PermissionReadElasticsearchPostIndexingJob), model.PermissionReadElasticsearchPostIndexingJob
	case model.JobTypeElasticsearchPostAggregation:
		return a.SessionHasPermissionTo(session, model.PermissionReadElasticsearchPostAggregationJob), model.PermissionReadElasticsearchPostAggregationJob
	case model.JobTypeLdapSync:
		return a.SessionHasPermissionTo(session, model.PermissionReadLdapSyncJob), model.PermissionReadLdapSyncJob
	case
		model.JobTypeMigrations,
		model.JobTypePlugins,
		model.JobTypeProductNotices,
		model.JobTypeExpiryNotify,
		model.JobTypeActiveUsers,
		model.JobTypeImportProcess,
		model.JobTypeImportDelete,
		model.JobTypeExportProcess,
		model.JobTypeExportDelete,
		model.JobTypeCloud,
		model.JobTypeMobileSessionMetadata,
		model.JobTypeExtractContent:
		return a.SessionHasPermissionTo(session, model.PermissionReadJobs), model.PermissionReadJobs
	case model.JobTypeAccessControlSync:
		return a.SessionHasPermissionTo(session, model.PermissionManageSystem), model.PermissionManageSystem
	}
	return false, nil
}