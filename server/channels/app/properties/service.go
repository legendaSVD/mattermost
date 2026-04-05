package properties
import (
	"errors"
	"fmt"
	"sync"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
type CallerIDExtractor func(rctx request.CTX) string
type PropertyService struct {
	groupStore        store.PropertyGroupStore
	fieldStore        store.PropertyFieldStore
	valueStore        store.PropertyValueStore
	propertyAccess    *PropertyAccessService
	callerIDExtractor CallerIDExtractor
	groupCache        sync.Map
}
type ServiceConfig struct {
	PropertyGroupStore store.PropertyGroupStore
	PropertyFieldStore store.PropertyFieldStore
	PropertyValueStore store.PropertyValueStore
	CallerIDExtractor  CallerIDExtractor
}
func New(c ServiceConfig) (*PropertyService, error) {
	if err := c.validate(); err != nil {
		return nil, err
	}
	return &PropertyService{
		groupStore:        c.PropertyGroupStore,
		fieldStore:        c.PropertyFieldStore,
		valueStore:        c.PropertyValueStore,
		callerIDExtractor: c.CallerIDExtractor,
		propertyAccess:    nil,
	}, nil
}
func (c *ServiceConfig) validate() error {
	if c.PropertyGroupStore == nil || c.PropertyFieldStore == nil || c.PropertyValueStore == nil {
		return errors.New("required parameters are not provided")
	}
	return nil
}
func (ps *PropertyService) SetPropertyAccessService(pas *PropertyAccessService) {
	ps.propertyAccess = pas
}
func (ps *PropertyService) requiresAccessControl(groupID string) (bool, error) {
	group, err := ps.Group(model.CustomProfileAttributesPropertyGroupName)
	if err != nil {
		return false, fmt.Errorf("failed to check access control for group %q: %w", groupID, err)
	}
	return groupID == group.ID, nil
}
func (ps *PropertyService) setPluginCheckerForTests(pluginChecker PluginChecker) {
	if ps.propertyAccess != nil {
		ps.propertyAccess.setPluginCheckerForTests(pluginChecker)
	}
}
func (ps *PropertyService) extractCallerID(rctx request.CTX) string {
	if ps.callerIDExtractor == nil || rctx == nil {
		return ""
	}
	return ps.callerIDExtractor(rctx)
}