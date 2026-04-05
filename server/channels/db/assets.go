package db
import "embed"
var assets embed.FS
func Assets() embed.FS {
	return assets
}