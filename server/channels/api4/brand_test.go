package api4
import (
	"context"
	"net/http"
	"strings"
	"testing"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/v8/channels/utils/testutils"
)
func TestGetBrandImage(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	client := th.Client
	_, resp, err := client.GetBrandImage(context.Background())
	require.Error(t, err)
	CheckNotFoundStatus(t, resp)
	_, err = client.Logout(context.Background())
	require.NoError(t, err)
	_, resp, err = client.GetBrandImage(context.Background())
	require.Error(t, err)
	CheckNotFoundStatus(t, resp)
	_, resp, err = th.SystemAdminClient.GetBrandImage(context.Background())
	require.Error(t, err)
	CheckNotFoundStatus(t, resp)
}
func TestUploadBrandImage(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	client := th.Client
	data, err := testutils.ReadTestFile("test.png")
	require.NoError(t, err)
	resp, err := client.UploadBrandImage(context.Background(), data)
	require.Error(t, err)
	CheckForbiddenStatus(t, resp)
	_, err = client.Logout(context.Background())
	require.NoError(t, err)
	resp, err = client.UploadBrandImage(context.Background(), data)
	require.Error(t, err)
	if resp.StatusCode == http.StatusForbidden {
		CheckForbiddenStatus(t, resp)
	} else if resp.StatusCode == http.StatusUnauthorized {
		CheckUnauthorizedStatus(t, resp)
	} else {
		require.Fail(t, "Should have failed either forbidden or unauthorized")
	}
	resp, err = th.SystemAdminClient.UploadBrandImage(context.Background(), data)
	require.NoError(t, err)
	CheckCreatedStatus(t, resp)
}
func TestUploadBrandImageTwice(t *testing.T) {
	th := Setup(t)
	data, err := testutils.ReadTestFile("test.png")
	require.NoError(t, err)
	resp, err := th.SystemAdminClient.UploadBrandImage(context.Background(), data)
	require.NoError(t, err)
	CheckCreatedStatus(t, resp)
	receivedImg, resp, err := th.SystemAdminClient.GetBrandImage(context.Background())
	require.NoError(t, err)
	require.NotNil(t, receivedImg)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.NotEmpty(t, receivedImg, "Received image data should not be empty")
	files, err := th.App.FileBackend().ListDirectory("brand/")
	require.NoError(t, err)
	require.Len(t, files, 1, "Expected only the original image file")
	fileName := files[0]
	fileName = strings.TrimPrefix(fileName, "brand/")
	require.Equal(t, "image.png", fileName, "Expected the original image file")
	data2, err := testutils.ReadTestFile("test.tiff")
	require.NoError(t, err)
	resp, err = th.SystemAdminClient.UploadBrandImage(context.Background(), data2)
	require.NoError(t, err)
	CheckCreatedStatus(t, resp)
	files, err = th.App.FileBackend().ListDirectory("brand/")
	require.NoError(t, err)
	require.Len(t, files, 2, "Expected the original and backup files")
	hasOriginal := false
	hasBackup := false
	for _, file := range files {
		fileName := strings.TrimPrefix(file, "brand/")
		if fileName == "image.png" {
			hasOriginal = true
		} else if strings.HasSuffix(fileName, ".png") && strings.Contains(fileName, "-") {
			hasBackup = true
		}
	}
	require.True(t, hasOriginal, "Original image.png file should exist")
	require.True(t, hasBackup, "Backup image file should exist")
	receivedImg2, resp, err := th.SystemAdminClient.GetBrandImage(context.Background())
	require.NoError(t, err)
	require.NotNil(t, receivedImg2)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	require.NotEmpty(t, receivedImg2, "Received image data should not be empty")
}
func TestDeleteBrandImage(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t)
	data, err := testutils.ReadTestFile("test.png")
	require.NoError(t, err)
	resp, err := th.SystemAdminClient.UploadBrandImage(context.Background(), data)
	require.NoError(t, err)
	CheckCreatedStatus(t, resp)
	resp, err = th.Client.DeleteBrandImage(context.Background())
	require.Error(t, err)
	CheckForbiddenStatus(t, resp)
	_, err = th.Client.Logout(context.Background())
	require.NoError(t, err)
	resp, err = th.Client.DeleteBrandImage(context.Background())
	require.Error(t, err)
	CheckUnauthorizedStatus(t, resp)
	resp, err = th.SystemAdminClient.DeleteBrandImage(context.Background())
	require.NoError(t, err)
	CheckOKStatus(t, resp)
	resp, err = th.SystemAdminClient.DeleteBrandImage(context.Background())
	require.Error(t, err)
	CheckNotFoundStatus(t, resp)
}