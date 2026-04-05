package model
const ExportDataDir = "data"
type BulkExportOpts struct {
	IncludeAttachments      bool
	IncludeProfilePictures  bool
	IncludeArchivedChannels bool
	IncludeRolesAndSchemes  bool
	CreateArchive           bool
}