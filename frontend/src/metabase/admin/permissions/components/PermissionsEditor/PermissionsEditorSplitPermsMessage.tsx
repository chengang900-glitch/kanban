import { t } from "ttag";

import { useDispatch } from "metabase/redux";
import { updateUserSetting } from "metabase/redux/settings";
import { Alert, Box, Icon, Text } from "metabase/ui";

export const PermissionsEditorSplitPermsMessage = () => {
  const dispatch = useDispatch();

  const handleDismiss = () => {
    dispatch(
      updateUserSetting({
        key: "show-updated-permission-banner",
        value: false,
      }),
    );
  };

  return (
    <Box
      mt="0.75rem"
      mb="1.75rem"
      style={{
        marginInlineEnd: "2.5rem",
      }}
    >
      <Alert
        icon={<Icon name="info" size={16} />}
        color="core-brand"
        withCloseButton
        onClose={handleDismiss}
      >
        <Text>
          {t`Your data permissions may look different, but the access hasn’t changed.`}
        </Text>
      </Alert>
    </Box>
  );
};
