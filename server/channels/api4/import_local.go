package api4
import "net/http"
func (api *API) InitImportLocal() {
	api.BaseRoutes.Imports.Handle("", api.APILocal(listImports)).Methods(http.MethodGet)
	api.BaseRoutes.Import.Handle("", api.APILocal(deleteImport)).Methods(http.MethodDelete)
}