package sqlstore
import (
	"fmt"
	"slices"
	"strings"
	sq "github.com/mattermost/squirrel"
	"github.com/pkg/errors"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
)
func (s SqlChannelStore) CreateInitialSidebarCategories(rctx request.CTX, userId string, teamID string) (_ *model.OrderedSidebarCategories, err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, errors.Wrap(err, "CreateInitialSidebarCategories: begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	if err = s.createInitialSidebarCategoriesT(transaction, userId, teamID); err != nil {
		return nil, errors.Wrap(err, "CreateInitialSidebarCategories: createInitialSidebarCategoriesT")
	}
	oc, err := s.getSidebarCategoriesT(transaction, userId, teamID)
	if err != nil {
		return nil, errors.Wrap(err, "CreateInitialSidebarCategories: getSidebarCategoriesT")
	}
	if err := transaction.Commit(); err != nil {
		return nil, errors.Wrap(err, "CreateInitialSidebarCategories: commit_transaction")
	}
	return oc, nil
}
func (s SqlChannelStore) createInitialSidebarCategoriesT(transaction *sqlxTxWrapper, userId, teamId string) error {
	query := s.getQueryBuilder().
		Select("SidebarCategories.Type").
		From("SidebarCategories").
		Where(sq.Eq{
			"SidebarCategories.UserId": userId,
			"SidebarCategories.Type": []model.SidebarCategoryType{
				model.SidebarCategoryFavorites,
				model.SidebarCategoryChannels,
				model.SidebarCategoryDirectMessages,
			},
			"SidebarCategories.TeamId": teamId,
		})
	existingTypes := []model.SidebarCategoryType{}
	err := transaction.SelectBuilder(&existingTypes, query)
	if err != nil {
		return errors.Wrap(err, "createInitialSidebarCategoriesT: failed to select existing categories")
	}
	hasCategoryOfType := make(map[model.SidebarCategoryType]bool, len(existingTypes))
	for _, existingType := range existingTypes {
		hasCategoryOfType[existingType] = true
	}
	insertBuilder := s.getQueryBuilder().Insert("SidebarCategories").
		Columns("Id, UserId, TeamId, SortOrder, Sorting, Type, DisplayName, Muted, Collapsed")
	hasInsert := false
	if !hasCategoryOfType[model.SidebarCategoryFavorites] {
		favoritesCategoryId := fmt.Sprintf("%s_%s_%s", model.SidebarCategoryFavorites, userId, teamId)
		err = s.migrateFavoritesToSidebarT(transaction, userId, teamId, favoritesCategoryId)
		if err != nil {
			return errors.Wrap(err, "createInitialSidebarCategoriesT: failed to migrate favorites to sidebar")
		}
		insertBuilder = insertBuilder.Values(favoritesCategoryId, userId, teamId, model.DefaultSidebarSortOrderFavorites, model.SidebarCategorySortDefault, model.SidebarCategoryFavorites, "Favorites" , false, false)
		hasInsert = true
	}
	if !hasCategoryOfType[model.SidebarCategoryChannels] {
		channelsCategoryId := fmt.Sprintf("%s_%s_%s", model.SidebarCategoryChannels, userId, teamId)
		insertBuilder = insertBuilder.Values(channelsCategoryId, userId, teamId, model.DefaultSidebarSortOrderChannels, model.SidebarCategorySortDefault, model.SidebarCategoryChannels, "Channels" , false, false)
		hasInsert = true
	}
	if !hasCategoryOfType[model.SidebarCategoryDirectMessages] {
		directMessagesCategoryId := fmt.Sprintf("%s_%s_%s", model.SidebarCategoryDirectMessages, userId, teamId)
		insertBuilder = insertBuilder.Values(directMessagesCategoryId, userId, teamId, model.DefaultSidebarSortOrderDMs, model.SidebarCategorySortRecent, model.SidebarCategoryDirectMessages, "Direct Messages" , false, false)
		hasInsert = true
	}
	if hasInsert {
		_, err = transaction.ExecBuilder(insertBuilder)
		if err != nil {
			return errors.Wrap(err, "createInitialSidebarCategoriesT: failed to insert categories")
		}
	}
	return nil
}
type userMembership struct {
	UserId     string
	ChannelId  string
	CategoryId string
}
func (s SqlChannelStore) migrateMembershipToSidebar(transaction *sqlxTxWrapper, runningOrder *int64, sql string, args ...any) ([]userMembership, error) {
	memberships := []userMembership{}
	if err := transaction.Select(&memberships, sql, args...); err != nil {
		return nil, err
	}
	for _, favorite := range memberships {
		sql, args, err := s.getQueryBuilder().
			Insert("SidebarChannels").
			Columns("ChannelId", "UserId", "CategoryId", "SortOrder").
			Values(favorite.ChannelId, favorite.UserId, favorite.CategoryId, *runningOrder).ToSql()
		if err != nil {
			return nil, err
		}
		if _, err := transaction.Exec(sql, args...); err != nil && !IsUniqueConstraintError(err, []string{"UserId", "PRIMARY"}) {
			return nil, err
		}
		*runningOrder = *runningOrder + model.MinimalSidebarSortDistance
	}
	if err := transaction.Commit(); err != nil {
		return nil, err
	}
	return memberships, nil
}
func (s SqlChannelStore) migrateFavoritesToSidebarT(transaction *sqlxTxWrapper, userId, teamId, favoritesCategoryId string) error {
	favoritesQuery, favoritesParams, err := s.getQueryBuilder().
		Select("Preferences.Name").
		From("Preferences").
		Join("Channels on Preferences.Name = Channels.Id").
		Join("ChannelMembers on Preferences.Name = ChannelMembers.ChannelId and Preferences.UserId = ChannelMembers.UserId").
		Where(sq.Eq{
			"Preferences.UserId":   userId,
			"Preferences.Category": model.PreferenceCategoryFavoriteChannel,
			"Preferences.Value":    "true",
		}).
		Where(sq.Or{
			sq.Eq{"Channels.TeamId": teamId},
			sq.Eq{"Channels.TeamId": ""},
		}).
		OrderBy(
			"Channels.DisplayName",
			"Channels.Name ASC",
		).ToSql()
	if err != nil {
		return err
	}
	favoriteChannelIds := []string{}
	if err := transaction.Select(&favoriteChannelIds, favoritesQuery, favoritesParams...); err != nil {
		return errors.Wrap(err, "migrateFavoritesToSidebarT: unable to get favorite channel IDs")
	}
	for i, channelId := range favoriteChannelIds {
		if _, err := transaction.NamedExec(`INSERT INTO
			SidebarChannels(ChannelId, UserId, CategoryId, SortOrder)
			VALUES(:ChannelId, :UserId, :CategoryId, :SortOrder)`, &model.SidebarChannel{
			ChannelId:  channelId,
			CategoryId: favoritesCategoryId,
			UserId:     userId,
			SortOrder:  int64(i * model.MinimalSidebarSortDistance),
		}); err != nil {
			return errors.Wrap(err, "migrateFavoritesToSidebarT: unable to insert SidebarChannel")
		}
	}
	return nil
}
func (s SqlChannelStore) MigrateFavoritesToSidebarChannels(lastUserId string, runningOrder int64) (_ map[string]any, err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, err
	}
	defer finalizeTransactionX(transaction, &err)
	sb := s.
		getQueryBuilder().
		Select("Preferences.UserId", "Preferences.Name AS ChannelId", "SidebarCategories.Id AS CategoryId").
		From("Preferences").
		Where(sq.And{
			sq.Eq{"Preferences.Category": model.PreferenceCategoryFavoriteChannel},
			sq.NotEq{"Preferences.Value": "false"},
			sq.NotEq{"SidebarCategories.Id": nil},
			sq.Gt{"Preferences.UserId": lastUserId},
		}).
		LeftJoin("Channels ON (Channels.Id=Preferences.Name)").
		LeftJoin("SidebarCategories ON (SidebarCategories.UserId=Preferences.UserId AND SidebarCategories.Type='"+string(model.SidebarCategoryFavorites)+"' AND (SidebarCategories.TeamId=Channels.TeamId OR Channels.TeamId=''))").
		OrderBy("Preferences.UserId", "Channels.Name DESC").
		Limit(100)
	sql, args, err := sb.ToSql()
	if err != nil {
		return nil, err
	}
	userFavorites, err := s.migrateMembershipToSidebar(transaction, &runningOrder, sql, args...)
	if err != nil {
		return nil, err
	}
	if len(userFavorites) == 0 {
		return nil, nil
	}
	data := make(map[string]any)
	data["UserId"] = userFavorites[len(userFavorites)-1].UserId
	data["SortOrder"] = runningOrder
	return data, nil
}
type sidebarCategoryForJoin struct {
	model.SidebarCategory
	ChannelId *string
}
func (s SqlChannelStore) CreateSidebarCategory(userId, teamId string, newCategory *model.SidebarCategoryWithChannels) (_ *model.SidebarCategoryWithChannels, err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, errors.Wrap(err, "begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	categoriesWithOrder, err := s.getSidebarCategoriesT(transaction, userId, teamId)
	if err != nil {
		return nil, err
	} else if len(categoriesWithOrder.Categories) == 0 {
		return nil, store.NewErrNotFound("categories not found", fmt.Sprintf("userId=%s,teamId=%s", userId, teamId))
	}
	newOrder := categoriesWithOrder.Order
	newCategoryId := model.NewId()
	newCategorySortOrder := 0
	if categoriesWithOrder.Categories[0].Type == model.SidebarCategoryFavorites {
		newOrder = append([]string{newOrder[0], newCategoryId}, newOrder[1:]...)
		newCategorySortOrder = model.MinimalSidebarSortDistance
	} else {
		newOrder = append([]string{newCategoryId}, newOrder...)
	}
	category := &model.SidebarCategory{
		DisplayName: newCategory.DisplayName,
		Id:          newCategoryId,
		UserId:      userId,
		TeamId:      teamId,
		Sorting:     newCategory.Sorting,
		SortOrder:   int64(model.MinimalSidebarSortDistance * len(newOrder)),
		Type:        model.SidebarCategoryCustom,
		Muted:       newCategory.Muted,
	}
	if _, err2 := transaction.NamedExec(`INSERT INTO
			SidebarCategories(Id, UserId, TeamId, SortOrder, Sorting, Type, DisplayName, Muted, Collapsed)
			VALUES(:Id, :UserId, :TeamId, :SortOrder, :Sorting, :Type, :DisplayName, :Muted, :Collapsed)`, category); err2 != nil {
		return nil, errors.Wrap(err2, "failed to save SidebarCategory")
	}
	if len(newCategory.Channels) > 0 {
		placeHolder, channelIdArgs := constructArrayArgs(newCategory.Channels)
		deleteQuery := `
			DELETE FROM
				SidebarChannels
			USING
				SidebarCategories
			WHERE
				SidebarChannels.CategoryId = SidebarCategories.Id
				AND SidebarChannels.UserId = ?
				AND SidebarChannels.ChannelId IN ` + placeHolder + `
				AND SidebarCategories.TeamId = ?`
		args := []any{userId}
		args = append(args, channelIdArgs...)
		args = append(args, teamId)
		_, err = transaction.Exec(deleteQuery, args...)
		if err != nil {
			return nil, errors.Wrap(err, "failed to delete SidebarChannels")
		}
		insertQuery := s.getQueryBuilder().
			Insert("SidebarChannels").
			Columns("ChannelId", "UserId", "CategoryId", "SortOrder")
		for i, channelID := range newCategory.Channels {
			insertQuery = insertQuery.Values(channelID, userId, newCategoryId, int64(i*model.MinimalSidebarSortDistance))
		}
		sql, args, err := insertQuery.ToSql()
		if err != nil {
			return nil, errors.Wrap(err, "InsertSidebarChannels_Tosql")
		}
		if _, err := transaction.Exec(sql, args...); err != nil {
			return nil, errors.Wrap(err, "failed to save SidebarChannels")
		}
	}
	if err := s.updateSidebarCategoryOrderT(transaction, newOrder); err != nil {
		return nil, err
	}
	if err := transaction.Commit(); err != nil {
		return nil, errors.Wrap(err, "commit_transaction")
	}
	category.SortOrder = int64(newCategorySortOrder)
	result := &model.SidebarCategoryWithChannels{
		SidebarCategory: *category,
		Channels:        newCategory.Channels,
	}
	return result, nil
}
func (s SqlChannelStore) completePopulatingCategoryT(db sqlxExecutor, category *model.SidebarCategoryWithChannels) (*model.SidebarCategoryWithChannels, error) {
	populatedChannels, err := s.getOrphanedSidebarChannels(
		db,
		category.UserId,
		category.TeamId,
		category.Type == model.SidebarCategoryChannels,
		category.Type == model.SidebarCategoryDirectMessages,
	)
	if err != nil {
		return nil, errors.Wrap(err, "Failed to get orphaned sidebar channels")
	}
	for _, channel := range populatedChannels {
		category.Channels = append(category.Channels, channel.Id)
	}
	return category, nil
}
func (s SqlChannelStore) completePopulatingCategoriesT(db sqlxExecutor, userId string, teamId string, categories []*model.SidebarCategoryWithChannels) ([]*model.SidebarCategoryWithChannels, error) {
	channelsIndex := -1
	dmsIndex := -1
	for i, category := range categories {
		if category.Type == model.SidebarCategoryChannels {
			channelsIndex = i
		} else if category.Type == model.SidebarCategoryDirectMessages {
			dmsIndex = i
		}
	}
	populatedChannels, err := s.getOrphanedSidebarChannels(
		db,
		userId,
		teamId,
		channelsIndex != -1,
		dmsIndex != -1,
	)
	if err != nil {
		return nil, errors.Wrap(err, "Failed to get orphaned sidebar channels")
	}
	for _, channel := range populatedChannels {
		if channelsIndex != -1 && (channel.Type == model.ChannelTypeOpen || channel.Type == model.ChannelTypePrivate) {
			categories[channelsIndex].Channels = append(categories[channelsIndex].Channels, channel.Id)
		} else if dmsIndex != -1 && (channel.Type == model.ChannelTypeDirect || channel.Type == model.ChannelTypeGroup) {
			categories[dmsIndex].Channels = append(categories[dmsIndex].Channels, channel.Id)
		}
	}
	return categories, nil
}
type OrphanedSidebarChannel struct {
	Id   string
	Type model.ChannelType
}
func (s SqlChannelStore) getOrphanedSidebarChannels(db sqlxExecutor, userId string, teamId string, selectChannels bool, selectDMs bool) ([]*OrphanedSidebarChannel, error) {
	if !selectChannels && !selectDMs {
		return nil, nil
	}
	channelTypeFilter := sq.Or{}
	if selectDMs {
		channelTypeFilter = append(channelTypeFilter, sq.Eq{"Channels.Type": []model.ChannelType{model.ChannelTypeDirect, model.ChannelTypeGroup}})
	}
	if selectChannels {
		channelTypeFilter = append(channelTypeFilter, sq.And{
			sq.Eq{"Channels.Type": []model.ChannelType{model.ChannelTypeOpen, model.ChannelTypePrivate}},
			sq.Eq{"Channels.TeamId": teamId},
		})
	}
	doesNotHaveSidebarChannel := sq.Select("1").
		Prefix("NOT EXISTS (").
		From("SidebarChannels").
		Join("SidebarCategories on SidebarChannels.CategoryId=SidebarCategories.Id").
		Suffix(")")
	doesNotHaveSidebarChannel = doesNotHaveSidebarChannel.Where(sq.And{
		sq.Expr("SidebarChannels.ChannelId = ChannelMembers.ChannelId"),
		sq.Eq{"SidebarCategories.UserId": userId},
		sq.Eq{"SidebarCategories.TeamId": teamId},
	})
	channels := []*OrphanedSidebarChannel{}
	sql, args, err := s.getQueryBuilder().
		Select("Id, Channels.Type").
		From("ChannelMembers").
		LeftJoin("Channels ON Channels.Id=ChannelMembers.ChannelId").
		Where(sq.And{
			sq.Eq{"ChannelMembers.UserId": userId},
			channelTypeFilter,
			sq.Eq{"Channels.DeleteAt": 0},
			doesNotHaveSidebarChannel,
		}).
		OrderBy("DisplayName ASC").ToSql()
	if err != nil {
		return nil, errors.Wrap(err, "channel_tosql")
	}
	if err := db.Select(&channels, sql, args...); err != nil {
		return nil, errors.Wrap(err, "failed to get channel members")
	}
	return channels, nil
}
func (s SqlChannelStore) GetSidebarCategory(categoryId string) (*model.SidebarCategoryWithChannels, error) {
	return s.getSidebarCategoryT(s.GetReplica(), categoryId)
}
func (s SqlChannelStore) getSidebarCategoryT(db sqlxExecutor, categoryId string) (*model.SidebarCategoryWithChannels, error) {
	query := s.sidebarCategorySelectQuery.
		Columns("SidebarChannels.ChannelId").
		LeftJoin("SidebarChannels ON SidebarChannels.CategoryId=SidebarCategories.Id").
		Where(sq.Eq{"SidebarCategories.Id": categoryId}).
		OrderBy("SidebarChannels.SortOrder ASC")
	sql, args, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrap(err, "sidebar_category_tosql")
	}
	categories := []*sidebarCategoryForJoin{}
	if err = db.Select(&categories, sql, args...); err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("failed to get category with id=%s", categoryId))
	}
	if len(categories) == 0 {
		return nil, store.NewErrNotFound("SidebarCategories", categoryId)
	}
	result := &model.SidebarCategoryWithChannels{
		SidebarCategory: categories[0].SidebarCategory,
		Channels:        make([]string, 0),
	}
	for _, category := range categories {
		if category.ChannelId != nil {
			result.Channels = append(result.Channels, *category.ChannelId)
		}
	}
	return s.completePopulatingCategoryT(db, result)
}
func (s SqlChannelStore) getSidebarCategoriesT(db sqlxExecutor, userId, teamId string) (*model.OrderedSidebarCategories, error) {
	oc := model.OrderedSidebarCategories{
		Categories: make(model.SidebarCategoriesWithChannels, 0),
		Order:      make([]string, 0),
	}
	categories := []*sidebarCategoryForJoin{}
	query := s.sidebarCategorySelectQuery.
		Columns("SidebarChannels.ChannelId").
		LeftJoin("SidebarChannels ON SidebarChannels.CategoryId=SidebarCategories.Id").
		Where(sq.And{
			sq.Eq{"SidebarCategories.UserId": userId},
			sq.Eq{"SidebarCategories.TeamId": teamId},
		}).
		OrderBy("SidebarCategories.SortOrder ASC, SidebarChannels.SortOrder ASC")
	sql, args, err := query.ToSql()
	if err != nil {
		return nil, errors.Wrap(err, "sidebar_categories_tosql")
	}
	if err := db.Select(&categories, sql, args...); err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("failed to get categories for userId=%s, teamId=%s", userId, teamId))
	}
	for _, category := range categories {
		var prevCategory *model.SidebarCategoryWithChannels
		for _, existing := range oc.Categories {
			if existing.Id == category.Id {
				prevCategory = existing
				break
			}
		}
		if prevCategory == nil {
			prevCategory = &model.SidebarCategoryWithChannels{
				SidebarCategory: category.SidebarCategory,
				Channels:        make([]string, 0),
			}
			oc.Categories = append(oc.Categories, prevCategory)
			oc.Order = append(oc.Order, category.Id)
		}
		if category.ChannelId != nil {
			prevCategory.Channels = append(prevCategory.Channels, *category.ChannelId)
		}
	}
	if _, err := s.completePopulatingCategoriesT(db, userId, teamId, oc.Categories); err != nil {
		return nil, err
	}
	return &oc, nil
}
func (s SqlChannelStore) GetSidebarCategoriesForTeamForUser(userId, teamId string) (*model.OrderedSidebarCategories, error) {
	return s.getSidebarCategoriesT(s.GetReplica(), userId, teamId)
}
func (s SqlChannelStore) GetSidebarCategories(userID string, teamID string) (*model.OrderedSidebarCategories, error) {
	return s.getSidebarCategoriesT(s.GetReplica(), userID, teamID)
}
func (s SqlChannelStore) GetSidebarCategoryOrder(userId, teamId string) ([]string, error) {
	return s.getSidebarCategoryOrderT(s.GetReplica(), userId, teamId)
}
func (s SqlChannelStore) getSidebarCategoryOrderT(db sqlxExecutor, userId, teamId string) ([]string, error) {
	ids := []string{}
	query := s.getQueryBuilder().
		Select("Id").
		From("SidebarCategories").
		Where(sq.And{
			sq.Eq{"UserId": userId},
			sq.Eq{"TeamId": teamId},
		}).
		OrderBy("SidebarCategories.SortOrder ASC")
	if err := db.SelectBuilder(&ids, query); err != nil {
		return nil, errors.Wrap(err, fmt.Sprintf("failed to get category order for userId=%s, teamId=%s", userId, teamId))
	}
	return ids, nil
}
func (s SqlChannelStore) updateSidebarCategoryOrderT(transaction *sqlxTxWrapper, categoryOrder []string) error {
	runningOrder := 0
	for _, categoryId := range categoryOrder {
		sql, args, err := s.getQueryBuilder().
			Update("SidebarCategories").
			Set("SortOrder", runningOrder).
			Where(sq.Eq{"Id": categoryId}).ToSql()
		if err != nil {
			return errors.Wrap(err, "updateSidebarCategoryOrderT_Tosql")
		}
		if _, err := transaction.Exec(sql, args...); err != nil {
			return errors.Wrap(err, "Error updating sidebar category order")
		}
		runningOrder += model.MinimalSidebarSortDistance
	}
	return nil
}
func (s SqlChannelStore) UpdateSidebarCategoryOrder(userId, teamId string, categoryOrder []string) (err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return errors.Wrap(err, "begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	existingOrder, err := s.getSidebarCategoryOrderT(transaction, userId, teamId)
	if err != nil {
		return err
	}
	if len(existingOrder) != len(categoryOrder) {
		return errors.New("cannot update category order, passed list of categories different size than in DB")
	}
	for _, originalCategoryId := range existingOrder {
		found := slices.Contains(categoryOrder, originalCategoryId)
		if !found {
			return store.NewErrInvalidInput("SidebarCategories", "id", fmt.Sprintf("%v", categoryOrder))
		}
	}
	if err := s.updateSidebarCategoryOrderT(transaction, categoryOrder); err != nil {
		return err
	}
	if err := transaction.Commit(); err != nil {
		return errors.Wrap(err, "commit_transaction")
	}
	return nil
}
func (s SqlChannelStore) UpdateSidebarCategories(userId, teamId string, categories []*model.SidebarCategoryWithChannels) (updated []*model.SidebarCategoryWithChannels, original []*model.SidebarCategoryWithChannels, err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return nil, nil, errors.Wrap(err, "begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	updatedCategories := []*model.SidebarCategoryWithChannels{}
	originalCategories := []*model.SidebarCategoryWithChannels{}
	for _, category := range categories {
		srcCategory, err2 := s.getSidebarCategoryT(transaction, category.Id)
		if err2 != nil {
			return nil, nil, errors.Wrap(err2, "failed to find SidebarCategories")
		}
		destCategory := &model.SidebarCategoryWithChannels{
			SidebarCategory: category.SidebarCategory,
		}
		destCategory.UserId = srcCategory.UserId
		destCategory.TeamId = srcCategory.TeamId
		destCategory.SortOrder = srcCategory.SortOrder
		destCategory.Type = srcCategory.Type
		destCategory.Muted = srcCategory.Muted
		if destCategory.Type != model.SidebarCategoryCustom {
			destCategory.DisplayName = srcCategory.DisplayName
		}
		if destCategory.Type != model.SidebarCategoryDirectMessages {
			destCategory.Channels = make([]string, len(category.Channels))
			copy(destCategory.Channels, category.Channels)
			destCategory.Muted = category.Muted
		} else {
			destCategory.Channels = make([]string, 0)
		}
		updatedCategories = append(updatedCategories, destCategory)
		originalCategories = append(originalCategories, srcCategory)
	}
	sortedUpdatedCategories := slices.Clone(updatedCategories)
	slices.SortFunc(sortedUpdatedCategories, func(a *model.SidebarCategoryWithChannels, b *model.SidebarCategoryWithChannels) int {
		return strings.Compare(a.Id, b.Id)
	})
	for _, destCategory := range sortedUpdatedCategories {
		updateQuery, updateParams, err2 := s.getQueryBuilder().
			Update("SidebarCategories").
			Set("DisplayName", destCategory.DisplayName).
			Set("Sorting", destCategory.Sorting).
			Set("Muted", destCategory.Muted).
			Set("Collapsed", destCategory.Collapsed).
			Where(sq.Eq{"Id": destCategory.Id}).ToSql()
		if err2 != nil {
			return nil, nil, errors.Wrap(err2, "update_sidebar_categories_tosql1")
		}
		if _, err = transaction.Exec(updateQuery, updateParams...); err != nil {
			return nil, nil, errors.Wrap(err, "failed to update SidebarCategories")
		}
	}
	categoryIds := make([]string, len(categories))
	for i, category := range categories {
		categoryIds[i] = category.Id
	}
	query, args, err2 := s.getQueryBuilder().
		Delete("SidebarChannels").
		Where(sq.Eq{"CategoryId": categoryIds}).ToSql()
	if err2 != nil {
		return nil, nil, errors.Wrap(err2, "update_sidebar_categories_tosql2")
	}
	if _, err = transaction.Exec(query, args...); err != nil {
		return nil, nil, errors.Wrap(err, "failed to delete SidebarChannels")
	}
	for _, category := range categories {
		if category.Type == model.SidebarCategoryDirectMessages {
			continue
		}
		runningOrder := 0
		insertQuery := s.getQueryBuilder().
			Insert("SidebarChannels").
			Columns("ChannelId", "UserId", "CategoryId", "SortOrder")
		insertQuery = insertQuery.Suffix("ON CONFLICT (ChannelId, UserId, CategoryId) DO UPDATE SET SortOrder = excluded.SortOrder")
		for _, channelID := range category.Channels {
			insertQuery = insertQuery.Values(channelID, userId, category.Id, int64(runningOrder))
			runningOrder += model.MinimalSidebarSortDistance
		}
		if len(category.Channels) > 0 {
			sql, args, err2 := insertQuery.ToSql()
			if err2 != nil {
				return nil, nil, errors.Wrap(err2, "InsertSidebarChannels_Tosql")
			}
			if _, err2 := transaction.Exec(sql, args...); err2 != nil {
				return nil, nil, errors.Wrap(err2, "failed to save SidebarChannels")
			}
		}
	}
	for i, category := range categories {
		srcCategory := originalCategories[i]
		if category.Type == model.SidebarCategoryFavorites {
			sql, args, err2 := s.getQueryBuilder().Delete("Preferences").Where(
				sq.Eq{
					"UserId":   userId,
					"Name":     srcCategory.Channels,
					"Category": model.PreferenceCategoryFavoriteChannel,
				},
			).ToSql()
			if err2 != nil {
				return nil, nil, errors.Wrap(err2, "UpdateSidebarChannels_Tosql_DeletePreferences")
			}
			if _, err = transaction.Exec(sql, args...); err != nil {
				return nil, nil, errors.Wrap(err, "failed to delete Preferences")
			}
			for _, channelID := range category.Channels {
				if err = s.Preference().(*SqlPreferenceStore).save(transaction, &model.Preference{
					Name:     channelID,
					UserId:   userId,
					Category: model.PreferenceCategoryFavoriteChannel,
					Value:    "true",
				}); err != nil {
					return nil, nil, errors.Wrap(err, "failed to save Preference")
				}
			}
		} else {
			query, args, nErr := s.getQueryBuilder().Delete("Preferences").Where(
				sq.Eq{
					"UserId":   userId,
					"Name":     category.Channels,
					"Category": model.PreferenceCategoryFavoriteChannel,
				},
			).ToSql()
			if nErr != nil {
				return nil, nil, errors.Wrap(nErr, "update_sidebar_categories_tosql")
			}
			if _, nErr = transaction.Exec(query, args...); nErr != nil {
				return nil, nil, errors.Wrap(nErr, "failed to delete Preferences")
			}
		}
	}
	if _, nErr := s.completePopulatingCategoriesT(transaction, userId, teamId, updatedCategories); nErr != nil {
		return nil, nil, nErr
	}
	if err = transaction.Commit(); err != nil {
		return nil, nil, errors.Wrap(err, "commit_transaction")
	}
	return updatedCategories, originalCategories, nil
}
func (s SqlChannelStore) UpdateSidebarChannelsByPreferences(preferences model.Preferences) (err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return errors.Wrap(err, "UpdateSidebarChannelsByPreferences: begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	for _, preference := range preferences {
		if preference.Category != model.PreferenceCategoryFavoriteChannel {
			continue
		}
		if preference.Value == "false" {
			if err := s.removeSidebarEntriesForPreferenceT(transaction, &preference); err != nil {
				return errors.Wrap(err, "UpdateSidebarChannelsByPreferences: removeSidebarEntriesForPreferenceT")
			}
		} else {
			if err := s.addChannelToFavoritesCategoryT(transaction, &preference); err != nil {
				return errors.Wrap(err, "UpdateSidebarChannelsByPreferences: addChannelToFavoritesCategoryT")
			}
		}
	}
	if err := transaction.Commit(); err != nil {
		return errors.Wrap(err, "UpdateSidebarChannelsByPreferences: commit_transaction")
	}
	return nil
}
func (s SqlChannelStore) removeSidebarEntriesForPreferenceT(transaction *sqlxTxWrapper, preference *model.Preference) error {
	if preference.Category != model.PreferenceCategoryFavoriteChannel {
		return nil
	}
	query := `
		DELETE FROM
			SidebarChannels
		USING
			SidebarCategories
		WHERE
			SidebarChannels.CategoryId = SidebarCategories.Id
			AND SidebarChannels.UserId = ?
			AND SidebarChannels.ChannelId = ?
			AND SidebarCategories.Type = ?`
	if _, err := transaction.Exec(query, preference.UserId, preference.Name, model.SidebarCategoryFavorites); err != nil {
		return errors.Wrap(err, "Failed to remove sidebar entries for preference")
	}
	return nil
}
func (s SqlChannelStore) addChannelToFavoritesCategoryT(transaction *sqlxTxWrapper, preference *model.Preference) error {
	if preference.Category != model.PreferenceCategoryFavoriteChannel {
		return nil
	}
	var channel model.Channel
	if err := transaction.Get(&channel, `SELECT Id, TeamId FROM Channels WHERE Id=?`, preference.Name); err != nil {
		return errors.Wrapf(err, "Failed to get favorited channel with id=%s", preference.Name)
	} else if channel.Id == "" {
		return store.NewErrNotFound("Channel", preference.Name)
	}
	builder := s.getQueryBuilder().
		Select("SidebarCategories.Id").
		From("SidebarCategories").
		LeftJoin("SidebarChannels on SidebarCategories.Id = SidebarChannels.CategoryId and SidebarChannels.ChannelId = ?", preference.Name).
		Where(sq.Eq{
			"SidebarCategories.UserId": preference.UserId,
			"Type":                     model.SidebarCategoryFavorites,
		}).
		Where("SidebarChannels.ChannelId is null")
	if channel.TeamId != "" {
		builder = builder.Where(sq.Eq{"TeamId": channel.TeamId})
	}
	idsQuery, idsParams, err := builder.ToSql()
	if err != nil {
		return errors.Wrap(err, "addChannelToFavoritesCategoryT_ToSql_Select")
	}
	categoryIds := []string{}
	if err = transaction.Select(&categoryIds, idsQuery, idsParams...); err != nil {
		return errors.Wrap(err, "Failed to get Favorites sidebar categories")
	}
	if len(categoryIds) == 0 {
		return nil
	}
	insertQuery, insertParams, err := s.getQueryBuilder().
		Insert("SidebarChannels").
		Columns(
			"ChannelId",
			"CategoryId",
			"UserId",
			"SortOrder",
		).
		Select(
			sq.Select().
				Column("? as ChannelId", preference.Name).
				Column("SidebarCategories.Id as CategoryId").
				Column("? as UserId", preference.UserId).
				Column("COALESCE(MIN(SidebarChannels.SortOrder) - 10, 0) as SortOrder").
				From("SidebarCategories").
				LeftJoin("SidebarChannels on SidebarCategories.Id = SidebarChannels.CategoryId").
				Where(sq.Eq{
					"SidebarCategories.Id": categoryIds,
				}).
				GroupBy("SidebarCategories.Id")).ToSql()
	if err != nil {
		return errors.Wrap(err, "addChannelToFavoritesCategoryT_ToSql_Insert")
	}
	if _, err := transaction.Exec(insertQuery, insertParams...); err != nil {
		return errors.Wrap(err, "Failed to add sidebar entries for favorited channel")
	}
	return nil
}
func (s SqlChannelStore) DeleteSidebarChannelsByPreferences(preferences model.Preferences) (err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return errors.Wrap(err, "DeleteSidebarChannelsByPreferences: begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	for _, preference := range preferences {
		if preference.Category != model.PreferenceCategoryFavoriteChannel {
			continue
		}
		if err := s.removeSidebarEntriesForPreferenceT(transaction, &preference); err != nil {
			return errors.Wrap(err, "DeleteSidebarChannelsByPreferences: removeSidebarEntriesForPreferenceT")
		}
	}
	if err := transaction.Commit(); err != nil {
		return errors.Wrap(err, "DeleteSidebarChannelsByPreferences: commit_transaction")
	}
	return nil
}
func (s SqlChannelStore) UpdateSidebarChannelCategoryOnMove(channel *model.Channel, newTeamId string) error {
	if _, err := s.GetMaster().Exec("DELETE FROM SidebarChannels WHERE ChannelId=?", channel.Id); err != nil {
		return errors.Wrapf(err, "failed to delete SidebarChannels with channelId=%s", channel.Id)
	}
	return nil
}
func (s SqlChannelStore) ClearSidebarOnTeamLeave(userId, teamId string) error {
	deleteQuery := `
		DELETE FROM
			SidebarChannels
		WHERE
			CategoryId IN (
				SELECT
					CategoryId
				FROM
					SidebarChannels,
					SidebarCategories
				WHERE
					SidebarChannels.CategoryId = SidebarCategories.Id
					AND SidebarCategories.TeamId = ?
					AND SidebarChannels.UserId = ?)`
	if _, err := s.GetMaster().Exec(deleteQuery, teamId, userId); err != nil {
		return errors.Wrap(err, "failed to delete from SidebarChannels")
	}
	if _, err := s.GetMaster().Exec("DELETE FROM SidebarCategories WHERE SidebarCategories.TeamId = ? AND SidebarCategories.UserId = ?", teamId, userId); err != nil {
		return errors.Wrap(err, "failed to delete from SidebarCategories")
	}
	return nil
}
func (s SqlChannelStore) DeleteSidebarCategory(categoryId string) (err error) {
	transaction, err := s.GetMaster().Beginx()
	if err != nil {
		return errors.Wrap(err, "begin_transaction")
	}
	defer finalizeTransactionX(transaction, &err)
	var category model.SidebarCategory
	query := s.sidebarCategorySelectQuery.Where(sq.Eq{"Id": categoryId})
	if err = transaction.GetBuilder(&category, query); err != nil {
		return errors.Wrapf(err, "failed to find SidebarCategories with id=%s", categoryId)
	}
	if category.Type != model.SidebarCategoryCustom {
		return store.NewErrInvalidInput("SidebarCategory", "id", categoryId)
	}
	deleteCategoryQuery := s.getQueryBuilder().
		Delete("SidebarCategories").
		Where(sq.Eq{"Id": categoryId})
	if _, err = transaction.ExecBuilder(deleteCategoryQuery); err != nil {
		return errors.Wrap(err, "failed to delete SidebarCategory")
	}
	deleteCategoryChannelsQuery := s.getQueryBuilder().
		Delete("SidebarChannels").
		Where(sq.Eq{"CategoryId": categoryId})
	if _, err = transaction.ExecBuilder(deleteCategoryChannelsQuery); err != nil {
		return errors.Wrap(err, "failed to delete SidebarChannel")
	}
	if err := transaction.Commit(); err != nil {
		return errors.Wrap(err, "commit_transaction")
	}
	return nil
}
func (s SqlChannelStore) DeleteAllSidebarChannelForChannel(channelID string) error {
	query, args, err := s.getQueryBuilder().
		Delete("SidebarChannels").
		Where(sq.Eq{
			"ChannelId": channelID,
		}).ToSql()
	if err != nil {
		return errors.Wrap(err, "delete_all_sidebar_channel_for_channel_to_sql")
	}
	_, err = s.GetMaster().Exec(query, args...)
	return err
}