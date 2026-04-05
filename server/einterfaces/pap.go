package einterfaces
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type PolicyAdministrationPointInterface interface {
	Init(rctx request.CTX) *model.AppError
	GetPolicyRuleAttributes(rctx request.CTX, policyID string, action string) (map[string][]string, *model.AppError)
	CheckExpression(rctx request.CTX, expression string) ([]model.CELExpressionError, *model.AppError)
	ExpressionToVisualAST(rctx request.CTX, expression string) (*model.VisualExpression, *model.AppError)
	NormalizePolicy(rctx request.CTX, policy *model.AccessControlPolicy) (*model.AccessControlPolicy, *model.AppError)
	QueryUsersForExpression(rctx request.CTX, expression string, opts model.SubjectSearchOptions) ([]*model.User, int64, *model.AppError)
	QueryUsersForResource(rctx request.CTX, resourceID, action string, opts model.SubjectSearchOptions) ([]*model.User, int64, *model.AppError)
	GetChannelMembersToRemove(rctx request.CTX, channelID string) ([]*model.ChannelMember, *model.AppError)
	SavePolicy(rctx request.CTX, policy *model.AccessControlPolicy) (*model.AccessControlPolicy, *model.AppError)
	GetPolicy(rctx request.CTX, id string) (*model.AccessControlPolicy, *model.AppError)
	DeletePolicy(rctx request.CTX, id string) *model.AppError
	GetPoliciesForFieldIDs(rctx request.CTX, fieldIDs []string) ([]*model.AccessControlPolicy, *model.AppError)
}