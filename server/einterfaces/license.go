package einterfaces
import "github.com/mattermost/mattermost/server/public/model"
type LicenseInterface interface {
	CanStartTrial() (bool, error)
	GetPrevTrial() (*model.License, error)
	NewMattermostEntryLicense(serverId string) *model.License
}