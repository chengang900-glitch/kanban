import { t } from "ttag";

import { Flex, Stack, Text, Title, rem } from "metabase/ui";

import { PermissionHelpDescription } from "../PermissionHelpDescription";

export const CollectionPermissionsHelp = () => {
  return (
    <Flex direction="column" py={rem(22)} px="xl">
      <Title order={3}>{t`Collection permissions`}</Title>
      <Text my="1rem">{t`People can be members of multiple groups, and Metabase grants them the most permissive level of access across all of a person's groups.`}</Text>

      <Title order={6} my="sm">{t`Collections Permission Levels`}</Title>

      <Stack gap={16} mt="1rem">
        <PermissionHelpDescription
          icon="check"
          iconColor="feedback-positive"
          name={t`Curate`}
          description={t`The group can view, save, edit, pin, and archive items in the collection.`}
        />

        <PermissionHelpDescription
          icon="permissions_limited"
          iconColor="feedback-warning"
          name={t`View`}
          description={t`The group can view items in a collection.`}
        />

        <PermissionHelpDescription
          icon="close"
          iconColor="feedback-negative"
          name={t`No access`}
          description={t`The group won't even see the collection listed.`}
        />
      </Stack>
    </Flex>
  );
};
