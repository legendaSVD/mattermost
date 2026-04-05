package model
const (
	AuditEventApplyIPFilters            = "applyIPFilters"
	AuditEventAssignAccessPolicy        = "assignAccessPolicy"
	AuditEventCreateAccessControlPolicy = "createAccessControlPolicy"
	AuditEventDeleteAccessControlPolicy = "deleteAccessControlPolicy"
	AuditEventUnassignAccessPolicy      = "unassignAccessPolicy"
	AuditEventUpdateActiveStatus        = "updateActiveStatus"
	AuditEventSetActiveStatus           = "setActiveStatus"
)
const (
	AuditEventAddAuditLogCertificate    = "addAuditLogCertificate"
	AuditEventGetAudits                 = "getAudits"
	AuditEventGetUserAudits             = "getUserAudits"
	AuditEventRemoveAuditLogCertificate = "removeAuditLogCertificate"
)
const (
	AuditEventAssignBot        = "assignBot"
	AuditEventConvertBotToUser = "convertBotToUser"
	AuditEventConvertUserToBot = "convertUserToBot"
	AuditEventCreateBot        = "createBot"
	AuditEventPatchBot         = "patchBot"
	AuditEventUpdateBotActive  = "updateBotActive"
)
const (
	AuditEventDeleteBrandImage = "deleteBrandImage"
	AuditEventUploadBrandImage = "uploadBrandImage"
)
const (
	AuditEventCreateChannelBookmark          = "createChannelBookmark"
	AuditEventDeleteChannelBookmark          = "deleteChannelBookmark"
	AuditEventUpdateChannelBookmark          = "updateChannelBookmark"
	AuditEventUpdateChannelBookmarkSortOrder = "updateChannelBookmarkSortOrder"
	AuditEventListChannelBookmarksForChannel = "listChannelBookmarksForChannel"
)
const (
	AuditEventCreateCategoryForTeamForUser      = "createCategoryForTeamForUser"
	AuditEventDeleteCategoryForTeamForUser      = "deleteCategoryForTeamForUser"
	AuditEventUpdateCategoriesForTeamForUser    = "updateCategoriesForTeamForUser"
	AuditEventUpdateCategoryForTeamForUser      = "updateCategoryForTeamForUser"
	AuditEventUpdateCategoryOrderForTeamForUser = "updateCategoryOrderForTeamForUser"
)
const (
	AuditEventAddChannelMember                   = "addChannelMember"
	AuditEventConvertGroupMessageToChannel       = "convertGroupMessageToChannel"
	AuditEventCreateChannel                      = "createChannel"
	AuditEventCreateDirectChannel                = "createDirectChannel"
	AuditEventCreateGroupChannel                 = "createGroupChannel"
	AuditEventDeleteChannel                      = "deleteChannel"
	AuditEventGetPinnedPosts                     = "getPinnedPosts"
	AuditEventLocalAddChannelMember              = "localAddChannelMember"
	AuditEventLocalCreateChannel                 = "localCreateChannel"
	AuditEventLocalDeleteChannel                 = "localDeleteChannel"
	AuditEventLocalMoveChannel                   = "localMoveChannel"
	AuditEventLocalPatchChannel                  = "localPatchChannel"
	AuditEventLocalRemoveChannelMember           = "localRemoveChannelMember"
	AuditEventLocalRestoreChannel                = "localRestoreChannel"
	AuditEventLocalUpdateChannelPrivacy          = "localUpdateChannelPrivacy"
	AuditEventMoveChannel                        = "moveChannel"
	AuditEventPatchChannel                       = "patchChannel"
	AuditEventPatchChannelModerations            = "patchChannelModerations"
	AuditEventRemoveChannelMember                = "removeChannelMember"
	AuditEventRestoreChannel                     = "restoreChannel"
	AuditEventUpdateChannel                      = "updateChannel"
	AuditEventUpdateChannelMemberNotifyProps     = "updateChannelMemberNotifyProps"
	AuditEventUpdateChannelMemberAutotranslation = "updateChannelMemberAutotranslation"
	AuditEventUpdateChannelMemberRoles           = "updateChannelMemberRoles"
	AuditEventUpdateChannelMemberSchemeRoles     = "updateChannelMemberSchemeRoles"
	AuditEventUpdateChannelPrivacy               = "updateChannelPrivacy"
	AuditEventUpdateChannelScheme                = "updateChannelScheme"
)
const (
	AuditEventCreateCommand      = "createCommand"
	AuditEventDeleteCommand      = "deleteCommand"
	AuditEventExecuteCommand     = "executeCommand"
	AuditEventLocalCreateCommand = "localCreateCommand"
	AuditEventMoveCommand        = "moveCommand"
	AuditEventRegenCommandToken  = "regenCommandToken"
	AuditEventUpdateCommand      = "updateCommand"
)
const (
	AuditEventCreateComplianceReport   = "createComplianceReport"
	AuditEventDownloadComplianceReport = "downloadComplianceReport"
	AuditEventGetComplianceReport      = "getComplianceReport"
	AuditEventGetComplianceReports     = "getComplianceReports"
)
const (
	AuditEventConfigReload         = "configReload"
	AuditEventGetConfig            = "getConfig"
	AuditEventLocalGetClientConfig = "localGetClientConfig"
	AuditEventLocalGetConfig       = "localGetConfig"
	AuditEventLocalPatchConfig     = "localPatchConfig"
	AuditEventLocalUpdateConfig    = "localUpdateConfig"
	AuditEventMigrateConfig        = "migrateConfig"
	AuditEventPatchConfig          = "patchConfig"
	AuditEventUpdateConfig         = "updateConfig"
)
const (
	AuditEventCreateCPAField = "createCPAField"
	AuditEventDeleteCPAField = "deleteCPAField"
	AuditEventPatchCPAField  = "patchCPAField"
	AuditEventPatchCPAValues = "patchCPAValues"
)
const (
	AuditEventAddChannelsToPolicy      = "addChannelsToPolicy"
	AuditEventAddTeamsToPolicy         = "addTeamsToPolicy"
	AuditEventCreatePolicy             = "createPolicy"
	AuditEventDeletePolicy             = "deletePolicy"
	AuditEventPatchPolicy              = "patchPolicy"
	AuditEventRemoveChannelsFromPolicy = "removeChannelsFromPolicy"
	AuditEventRemoveTeamsFromPolicy    = "removeTeamsFromPolicy"
)
const (
	AuditEventCreateEmoji = "createEmoji"
	AuditEventDeleteEmoji = "deleteEmoji"
)
const (
	AuditEventBulkExport               = "bulkExport"
	AuditEventDeleteExport             = "deleteExport"
	AuditEventGeneratePresignURLExport = "generatePresignURLExport"
	AuditEventScheduleExport           = "scheduleExport"
)
const (
	AuditEventGetFile                   = "getFile"
	AuditEventGetFileLink               = "getFileLink"
	AuditEventUploadFileMultipart       = "uploadFileMultipart"
	AuditEventUploadFileMultipartLegacy = "uploadFileMultipartLegacy"
	AuditEventUploadFileSimple          = "uploadFileSimple"
	AuditEventGetFileThumbnail          = "getFileThumbnail"
	AuditEventGetFileInfosForPost       = "getFileInfosForPost"
	AuditEventGetFileInfo               = "getFileInfo"
	AuditEventGetFilePreview            = "getFilePreview"
	AuditEventSearchFiles               = "searchFiles"
)
const (
	AuditEventAddGroupMembers         = "addGroupMembers"
	AuditEventAddUserToGroupSyncables = "addUserToGroupSyncables"
	AuditEventCreateGroup             = "createGroup"
	AuditEventDeleteGroup             = "deleteGroup"
	AuditEventDeleteGroupMembers      = "deleteGroupMembers"
	AuditEventLinkGroupSyncable       = "linkGroupSyncable"
	AuditEventPatchGroup              = "patchGroup"
	AuditEventPatchGroupSyncable      = "patchGroupSyncable"
	AuditEventRestoreGroup            = "restoreGroup"
	AuditEventUnlinkGroupSyncable     = "unlinkGroupSyncable"
)
const (
	AuditEventBulkImport   = "bulkImport"
	AuditEventDeleteImport = "deleteImport"
	AuditEventSlackImport  = "slackImport"
)
const (
	AuditEventCancelJob       = "cancelJob"
	AuditEventCreateJob       = "createJob"
	AuditEventJobServer       = "jobServer"
	AuditEventUpdateJobStatus = "updateJobStatus"
)
const (
	AuditEventAddLdapPrivateCertificate    = "addLdapPrivateCertificate"
	AuditEventAddLdapPublicCertificate     = "addLdapPublicCertificate"
	AuditEventIdMigrateLdap                = "idMigrateLdap"
	AuditEventLinkLdapGroup                = "linkLdapGroup"
	AuditEventRemoveLdapPrivateCertificate = "removeLdapPrivateCertificate"
	AuditEventRemoveLdapPublicCertificate  = "removeLdapPublicCertificate"
	AuditEventSyncLdap                     = "syncLdap"
	AuditEventUnlinkLdapGroup              = "unlinkLdapGroup"
)
const (
	AuditEventAddLicense          = "addLicense"
	AuditEventLocalAddLicense     = "localAddLicense"
	AuditEventLocalRemoveLicense  = "localRemoveLicense"
	AuditEventRemoveLicense       = "removeLicense"
	AuditEventRequestTrialLicense = "requestTrialLicense"
)
const (
	AuditEventAuthorizeOAuthApp                          = "authorizeOAuthApp"
	AuditEventAuthorizeOAuthPage                         = "authorizeOAuthPage"
	AuditEventCompleteOAuth                              = "completeOAuth"
	AuditEventCreateOAuthApp                             = "createOAuthApp"
	AuditEventCreateOutgoingOauthConnection              = "createOutgoingOauthConnection"
	AuditEventDeauthorizeOAuthApp                        = "deauthorizeOAuthApp"
	AuditEventDeleteOAuthApp                             = "deleteOAuthApp"
	AuditEventDeleteOutgoingOAuthConnection              = "deleteOutgoingOAuthConnection"
	AuditEventGetAccessToken                             = "getAccessToken"
	AuditEventLoginWithOAuth                             = "loginWithOAuth"
	AuditEventMobileLoginWithOAuth                       = "mobileLoginWithOAuth"
	AuditEventRegenerateOAuthAppSecret                   = "regenerateOAuthAppSecret"
	AuditEventRegisterOAuthClient                        = "registerOAuthClient"
	AuditEventSignupWithOAuth                            = "signupWithOAuth"
	AuditEventUpdateOAuthApp                             = "updateOAuthApp"
	AuditEventUpdateOutgoingOAuthConnection              = "updateOutgoingOAuthConnection"
	AuditEventValidateOutgoingOAuthConnectionCredentials = "validateOutgoingOAuthConnectionCredentials"
)
const (
	AuditEventDisablePlugin                       = "disablePlugin"
	AuditEventEnablePlugin                        = "enablePlugin"
	AuditEventGetFirstAdminVisitMarketplaceStatus = "getFirstAdminVisitMarketplaceStatus"
	AuditEventInstallMarketplacePlugin            = "installMarketplacePlugin"
	AuditEventInstallPluginFromURL                = "installPluginFromURL"
	AuditEventRemovePlugin                        = "removePlugin"
	AuditEventSetFirstAdminVisitMarketplaceStatus = "setFirstAdminVisitMarketplaceStatus"
	AuditEventUploadPlugin                        = "uploadPlugin"
)
const (
	AuditEventCreateEphemeralPost                = "createEphemeralPost"
	AuditEventCreatePost                         = "createPost"
	AuditEventDeletePost                         = "deletePost"
	AuditEventGetEditHistoryForPost              = "getEditHistoryForPost"
	AuditEventGetFlaggedPosts                    = "getFlaggedPosts"
	AuditEventGetPostsForChannel                 = "getPostsForChannel"
	AuditEventGetPostsForChannelAroundLastUnread = "getPostsForChannelAroundLastUnread"
	AuditEventGetPost                            = "getPost"
	AuditEventGetPostThread                      = "getPostThread"
	AuditEventGetPostsByIds                      = "getPostsByIds"
	AuditEventGetThreadForUser                   = "getThreadForUser"
	AuditEventLocalDeletePost                    = "localDeletePost"
	AuditEventMoveThread                         = "moveThread"
	AuditEventNotificationAck                    = "notificationAck"
	AuditEventPatchPost                          = "patchPost"
	AuditEventRestorePostVersion                 = "restorePostVersion"
	AuditEventSaveIsPinnedPost                   = "saveIsPinnedPost"
	AuditEventSearchPosts                        = "searchPosts"
	AuditEventUpdatePost                         = "updatePost"
	AuditEventRevealPost                         = "revealPost"
	AuditEventBurnPost                           = "burnPost"
	AuditEventWebsocketPost                      = "websocketPost"
)
const (
	AuditEventCreateRecap     = "createRecap"
	AuditEventGetRecap        = "getRecap"
	AuditEventGetRecaps       = "getRecaps"
	AuditEventMarkRecapAsRead = "markRecapAsRead"
	AuditEventRegenerateRecap = "regenerateRecap"
	AuditEventDeleteRecap     = "deleteRecap"
)
const (
	AuditEventDeletePreferences = "deletePreferences"
	AuditEventUpdatePreferences = "updatePreferences"
)
const (
	AuditEventCreateRemoteCluster            = "createRemoteCluster"
	AuditEventDeleteRemoteCluster            = "deleteRemoteCluster"
	AuditEventGenerateRemoteClusterInvite    = "generateRemoteClusterInvite"
	AuditEventInviteRemoteClusterToChannel   = "inviteRemoteClusterToChannel"
	AuditEventPatchRemoteCluster             = "patchRemoteCluster"
	AuditEventRemoteClusterAcceptInvite      = "remoteClusterAcceptInvite"
	AuditEventRemoteClusterAcceptMessage     = "remoteClusterAcceptMessage"
	AuditEventRemoteUploadProfileImage       = "remoteUploadProfileImage"
	AuditEventUninviteRemoteClusterToChannel = "uninviteRemoteClusterToChannel"
	AuditEventUploadRemoteData               = "uploadRemoteData"
)
const (
	AuditEventPatchRole = "patchRole"
)
const (
	AuditEventAddSamlIdpCertificate        = "addSamlIdpCertificate"
	AuditEventAddSamlPrivateCertificate    = "addSamlPrivateCertificate"
	AuditEventAddSamlPublicCertificate     = "addSamlPublicCertificate"
	AuditEventCompleteSaml                 = "completeSaml"
	AuditEventRemoveSamlIdpCertificate     = "removeSamlIdpCertificate"
	AuditEventRemoveSamlPrivateCertificate = "removeSamlPrivateCertificate"
	AuditEventRemoveSamlPublicCertificate  = "removeSamlPublicCertificate"
)
const (
	AuditEventCreateSchedulePost  = "createSchedulePost"
	AuditEventDeleteScheduledPost = "deleteScheduledPost"
	AuditEventUpdateScheduledPost = "updateScheduledPost"
)
const (
	AuditEventCreateScheme = "createScheme"
	AuditEventDeleteScheme = "deleteScheme"
	AuditEventPatchScheme  = "patchScheme"
)
const (
	AuditEventPurgeBleveIndexes         = "purgeBleveIndexes"
	AuditEventPurgeElasticsearchIndexes = "purgeElasticsearchIndexes"
)
const (
	AuditEventClearServerBusy            = "clearServerBusy"
	AuditEventCompleteOnboarding         = "completeOnboarding"
	AuditEventDatabaseRecycle            = "databaseRecycle"
	AuditEventDownloadLogs               = "downloadLogs"
	AuditEventGenerateSupportPacket      = "generateSupportPacket"
	AuditEventGetAppliedSchemaMigrations = "getAppliedSchemaMigrations"
	AuditEventGetLogs                    = "getLogs"
	AuditEventGetOnboarding              = "getOnboarding"
	AuditEventInvalidateCaches           = "invalidateCaches"
	AuditEventLocalCheckIntegrity        = "localCheckIntegrity"
	AuditEventQueryLogs                  = "queryLogs"
	AuditEventRestartServer              = "restartServer"
	AuditEventSetServerBusy              = "setServerBusy"
	AuditEventUpdateViewedProductNotices = "updateViewedProductNotices"
	AuditEventUpgradeToEnterprise        = "upgradeToEnterprise"
)
const (
	AuditEventAddTeamMember               = "addTeamMember"
	AuditEventAddTeamMembers              = "addTeamMembers"
	AuditEventAddUserToTeamFromInvite     = "addUserToTeamFromInvite"
	AuditEventCreateTeam                  = "createTeam"
	AuditEventDeleteTeam                  = "deleteTeam"
	AuditEventImportTeam                  = "importTeam"
	AuditEventInvalidateAllEmailInvites   = "invalidateAllEmailInvites"
	AuditEventInviteGuestsToChannels      = "inviteGuestsToChannels"
	AuditEventInviteUsersToTeam           = "inviteUsersToTeam"
	AuditEventLocalCreateTeam             = "localCreateTeam"
	AuditEventLocalDeleteTeam             = "localDeleteTeam"
	AuditEventLocalInviteUsersToTeam      = "localInviteUsersToTeam"
	AuditEventPatchTeam                   = "patchTeam"
	AuditEventRegenerateTeamInviteId      = "regenerateTeamInviteId"
	AuditEventRemoveTeamIcon              = "removeTeamIcon"
	AuditEventRemoveTeamMember            = "removeTeamMember"
	AuditEventRestoreTeam                 = "restoreTeam"
	AuditEventSetTeamIcon                 = "setTeamIcon"
	AuditEventUpdateTeam                  = "updateTeam"
	AuditEventUpdateTeamMemberRoles       = "updateTeamMemberRoles"
	AuditEventUpdateTeamMemberSchemeRoles = "updateTeamMemberSchemeRoles"
	AuditEventUpdateTeamPrivacy           = "updateTeamPrivacy"
	AuditEventUpdateTeamScheme            = "updateTeamScheme"
)
const (
	AuditEventCreateTermsOfService   = "createTermsOfService"
	AuditEventSaveUserTermsOfService = "saveUserTermsOfService"
)
const (
	AuditEventFollowThreadByUser              = "followThreadByUser"
	AuditEventSetUnreadThreadByPostId         = "setUnreadThreadByPostId"
	AuditEventUnfollowThreadByUser            = "unfollowThreadByUser"
	AuditEventUpdateReadStateAllThreadsByUser = "updateReadStateAllThreadsByUser"
	AuditEventUpdateReadStateThreadByUser     = "updateReadStateThreadByUser"
)
const (
	AuditEventCreateUpload = "createUpload"
	AuditEventUploadData   = "uploadData"
)
const (
	AuditEventAttachDeviceId               = "attachDeviceId"
	AuditEventCreateUser                   = "createUser"
	AuditEventCreateUserAccessToken        = "createUserAccessToken"
	AuditEventDeleteUser                   = "deleteUser"
	AuditEventDemoteUserToGuest            = "demoteUserToGuest"
	AuditEventDisableUserAccessToken       = "disableUserAccessToken"
	AuditEventEnableUserAccessToken        = "enableUserAccessToken"
	AuditEventExtendSessionExpiry          = "extendSessionExpiry"
	AuditEventLocalDeleteUser              = "localDeleteUser"
	AuditEventLocalPermanentDeleteAllUsers = "localPermanentDeleteAllUsers"
	AuditEventLogin                        = "login"
	AuditEventLoginWithDesktopToken        = "loginWithDesktopToken"
	AuditEventLogout                       = "logout"
	AuditEventMigrateAuthToLdap            = "migrateAuthToLdap"
	AuditEventMigrateAuthToSaml            = "migrateAuthToSaml"
	AuditEventPatchUser                    = "patchUser"
	AuditEventPromoteGuestToUser           = "promoteGuestToUser"
	AuditEventResetPassword                = "resetPassword"
	AuditEventResetPasswordFailedAttempts  = "resetPasswordFailedAttempts"
	AuditEventRevokeAllSessionsAllUsers    = "revokeAllSessionsAllUsers"
	AuditEventRevokeAllSessionsForUser     = "revokeAllSessionsForUser"
	AuditEventRevokeSession                = "revokeSession"
	AuditEventRevokeUserAccessToken        = "revokeUserAccessToken"
	AuditEventSendPasswordReset            = "sendPasswordReset"
	AuditEventSendVerificationEmail        = "sendVerificationEmail"
	AuditEventSetDefaultProfileImage       = "setDefaultProfileImage"
	AuditEventSetProfileImage              = "setProfileImage"
	AuditEventSwitchAccountType            = "switchAccountType"
	AuditEventUpdatePassword               = "updatePassword"
	AuditEventUpdateUser                   = "updateUser"
	AuditEventUpdateUserActive             = "updateUserActive"
	AuditEventUpdateUserAuth               = "updateUserAuth"
	AuditEventUpdateUserMfa                = "updateUserMfa"
	AuditEventUpdateUserRoles              = "updateUserRoles"
	AuditEventVerifyUserEmail              = "verifyUserEmail"
	AuditEventVerifyUserEmailWithoutToken  = "verifyUserEmailWithoutToken"
)
const (
	AuditEventCreateIncomingHook      = "createIncomingHook"
	AuditEventCreateOutgoingHook      = "createOutgoingHook"
	AuditEventDeleteIncomingHook      = "deleteIncomingHook"
	AuditEventDeleteOutgoingHook      = "deleteOutgoingHook"
	AuditEventGetIncomingHook         = "getIncomingHook"
	AuditEventGetOutgoingHook         = "getOutgoingHook"
	AuditEventLocalCreateIncomingHook = "localCreateIncomingHook"
	AuditEventRegenOutgoingHookToken  = "regenOutgoingHookToken"
	AuditEventUpdateIncomingHook      = "updateIncomingHook"
	AuditEventUpdateOutgoingHook      = "updateOutgoingHook"
)
const (
	AuditEventFlagPost                     = "flagPost"
	AuditEventGetFlaggedPost               = "getFlaggedPost"
	AuditEventPermanentlyRemoveFlaggedPost = "permanentlyRemoveFlaggedPost"
	AuditEventKeepFlaggedPost              = "keepFlaggedPost"
	AuditEventUpdateContentFlaggingConfig  = "updateContentFlaggingConfig"
	AuditEventSetReviewer                  = "setFlaggedPostReviewer"
)