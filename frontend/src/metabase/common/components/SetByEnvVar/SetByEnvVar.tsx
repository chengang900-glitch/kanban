import { jt } from "ttag";

import { ExternalLink } from "metabase/common/components/ExternalLink";
import { useDocsUrl } from "metabase/common/hooks";
import { Box, Text } from "metabase/ui";

export const SetByEnvVar = ({ varName }: { varName: string }) => {
  const { url, showMetabaseLinks } = useDocsUrl(
    "configuring-metabase/environment-variables",
    {
      anchor: varName?.toLowerCase(),
    },
  );

  return (
    <Box data-testid="setting-env-var-message" fw="bold" p="sm">
      {showMetabaseLinks
        ? jt`This has been set by the ${(
            <ExternalLink key="link" href={url}>
              {varName}
            </ExternalLink>
          )} environment variable.`
        : jt`This has been set by the ${(
            <Text key="variable" component="span" fw="bold">
              {varName}
            </Text>
          )} environment variable.`}
    </Box>
  );
};
