package driver
import (
	"context"
	"database/sql/driver"
	"github.com/mattermost/mattermost/server/public/plugin"
)
var (
	_ driver.Connector = &Connector{}
)
type Connector struct {
	api      plugin.Driver
	isMaster bool
}
func NewConnector(api plugin.Driver, isMaster bool) *Connector {
	return &Connector{api: api, isMaster: isMaster}
}
func (c *Connector) Connect(_ context.Context) (driver.Conn, error) {
	connID, err := c.api.Conn(c.isMaster)
	if err != nil {
		return nil, err
	}
	return &Conn{id: connID, api: c.api}, nil
}
func (c *Connector) Driver() driver.Driver {
	return &Driver{c: c}
}
type Driver struct {
	c *Connector
}
func (d Driver) Open(name string) (driver.Conn, error) {
	return d.c.Connect(context.Background())
}