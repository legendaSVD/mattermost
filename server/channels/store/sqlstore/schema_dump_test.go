package sqlstore
import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
func TestGetSchemaDefinition(t *testing.T) {
	StoreTest(t, func(t *testing.T, rctx request.CTX, ss store.Store) {
		t.Run("PostgreSQL", func(t *testing.T) {
			if ss.(*SqlStore).DriverName() != model.DatabaseDriverPostgres {
				t.Skip("Skipping test as database is not PostgreSQL")
			}
			schemaInfo, err := ss.GetSchemaDefinition()
			require.NoError(t, err)
			require.NotNil(t, schemaInfo)
			assert.Equal(t, "UTF8", schemaInfo.DatabaseEncoding, "Database encoding should be captured")
			assert.NotEmpty(t, schemaInfo.Tables)
			for _, table := range schemaInfo.Tables {
				columnNames := make(map[string]bool)
				for _, column := range table.Columns {
					assert.False(t, columnNames[column.Name], "Column %s in table %s is duplicated", column.Name, table.Name)
					columnNames[column.Name] = true
				}
			}
			tableNames := make([]string, 0, len(schemaInfo.Tables))
			for _, table := range schemaInfo.Tables {
				tableNames = append(tableNames, table.Name)
			}
			expectedTables := []string{"users", "channels", "teams", "posts"}
			assert.Subset(t, tableNames, expectedTables)
			for _, table := range schemaInfo.Tables {
				if table.Name == "users" {
					columnNames := make([]string, 0, len(table.Columns))
					for _, column := range table.Columns {
						columnNames = append(columnNames, column.Name)
					}
					expectedColumns := []string{"id", "username", "email"}
					assert.Subset(t, columnNames, expectedColumns)
					break
				}
			}
			for _, table := range schemaInfo.Tables {
				if table.Name == "channels" {
					assert.NotEmpty(t, table.Indexes, "channels table should have indexes")
					assert.Equal(t, 12, len(table.Indexes), "channels table should have 12 indexes")
					expectedIndexDefs := map[string]string{
						"idx_channels_delete_at":               "CREATE INDEX idx_channels_delete_at ON public.channels USING btree (deleteat)",
						"idx_channels_create_at":               "CREATE INDEX idx_channels_create_at ON public.channels USING btree (createat)",
						"channels_pkey":                        "CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id)",
						"channels_name_teamid_key":             "CREATE UNIQUE INDEX channels_name_teamid_key ON public.channels USING btree (name, teamid)",
						"idx_channels_displayname_lower":       "CREATE INDEX idx_channels_displayname_lower ON public.channels USING btree (lower((displayname)::text))",
						"idx_channels_name_lower":              "CREATE INDEX idx_channels_name_lower ON public.channels USING btree (lower((name)::text))",
						"idx_channels_update_at":               "CREATE INDEX idx_channels_update_at ON public.channels USING btree (updateat)",
						"idx_channel_search_txt":               "CREATE INDEX idx_channel_search_txt ON public.channels USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || (displayname)::text) || ' '::text) || (purpose)::text)))",
						"idx_channels_scheme_id":               "CREATE INDEX idx_channels_scheme_id ON public.channels USING btree (schemeid)",
						"idx_channels_team_id_display_name":    "CREATE INDEX idx_channels_team_id_display_name ON public.channels USING btree (teamid, displayname)",
						"idx_channels_team_id_type":            "CREATE INDEX idx_channels_team_id_type ON public.channels USING btree (teamid, type)",
						"idx_channels_autotranslation_enabled": "CREATE INDEX idx_channels_autotranslation_enabled ON public.channels USING btree (id) WHERE (autotranslation = true)",
					}
					foundIndexes := make(map[string]bool)
					for _, index := range table.Indexes {
						foundIndexes[index.Name] = true
						assert.NotEmpty(t, index.Definition, "Index %s should have a definition", index.Name)
						expectedDef, ok := expectedIndexDefs[index.Name]
						require.Truef(t, ok, "Unexpected definition found: %s", index.Name)
						assert.Equal(t, expectedDef, index.Definition, "Index %s has incorrect definition", index.Name)
					}
					for expectedName := range expectedIndexDefs {
						assert.True(t, foundIndexes[expectedName], "Expected index %s not found", expectedName)
					}
					break
				}
			}
		})
	})
}