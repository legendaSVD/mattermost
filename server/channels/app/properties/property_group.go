package properties
import (
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
)
func (ps *PropertyService) RegisterBuiltinGroups(groups []*model.PropertyGroup) error {
	for _, group := range groups {
		if _, err := ps.RegisterPropertyGroup(group.Name); err != nil {
			return fmt.Errorf("failed to register builtin property group %q: %w", group.Name, err)
		}
	}
	return nil
}
func (ps *PropertyService) Group(name string) (*model.PropertyGroup, error) {
	if cached, ok := ps.groupCache.Load(name); ok {
		return cached.(*model.PropertyGroup), nil
	}
	group, err := ps.groupStore.Get(name)
	if err != nil {
		return nil, fmt.Errorf("property group %q not found: %w", name, err)
	}
	ps.groupCache.Store(name, group)
	return group, nil
}
func (ps *PropertyService) RegisterPropertyGroup(name string) (*model.PropertyGroup, error) {
	group, err := ps.groupStore.Register(name)
	if err != nil {
		return nil, err
	}
	ps.groupCache.Store(name, group)
	return group, nil
}
func (ps *PropertyService) GetPropertyGroup(name string) (*model.PropertyGroup, error) {
	return ps.groupStore.Get(name)
}