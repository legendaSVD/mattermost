package plugin
import (
	"database/sql/driver"
)
type ResultContainer struct {
	LastID            int64
	LastIDError       error
	RowsAffected      int64
	RowsAffectedError error
}
type Driver interface {
	Conn(isMaster bool) (string, error)
	ConnPing(connID string) error
	ConnClose(connID string) error
	ConnQuery(connID, q string, args []driver.NamedValue) (string, error)
	ConnExec(connID, q string, args []driver.NamedValue) (ResultContainer, error)
	Tx(connID string, opts driver.TxOptions) (string, error)
	TxCommit(txID string) error
	TxRollback(txID string) error
	Stmt(connID, q string) (string, error)
	StmtClose(stID string) error
	StmtNumInput(stID string) int
	StmtQuery(stID string, args []driver.NamedValue) (string, error)
	StmtExec(stID string, args []driver.NamedValue) (ResultContainer, error)
	RowsColumns(rowsID string) []string
	RowsClose(rowsID string) error
	RowsNext(rowsID string, dest []driver.Value) error
	RowsHasNextResultSet(rowsID string) bool
	RowsNextResultSet(rowsID string) error
	RowsColumnTypeDatabaseTypeName(rowsID string, index int) string
	RowsColumnTypePrecisionScale(rowsID string, index int) (int64, int64, bool)
}
type AppDriver interface {
	Driver
	ConnWithPluginID(isMaster bool, pluginID string) (string, error)
	ShutdownConns(pluginID string)
}