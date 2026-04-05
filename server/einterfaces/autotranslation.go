package einterfaces
import (
	"context"
	"github.com/mattermost/mattermost/server/public/model"
	ejobs "github.com/mattermost/mattermost/server/v8/einterfaces/jobs"
)
type AutoTranslationInterface interface {
	IsFeatureAvailable() bool
	IsChannelEnabled(channelID string) (bool, *model.AppError)
	IsUserEnabled(channelID, userID string) (bool, *model.AppError)
	Translate(ctx context.Context, objectType, objectID, channelID, userID string, content any) (*model.Translation, *model.AppError)
	GetBatch(objectType string, objectIDs []string, dstLang string) (map[string]*model.Translation, *model.AppError)
	GetUserLanguage(userID, channelID string) (string, *model.AppError)
	DetectRemote(ctx context.Context, text string) (string, *float64, *model.AppError)
	Close() error
	Start() error
	Shutdown() error
	MakeWorker() model.Worker
	MakeScheduler() ejobs.Scheduler
}