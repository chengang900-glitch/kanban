import { jt, t } from "ttag";

import { useDocsUrl } from "metabase/common/hooks";
import { Alert, Anchor, Icon, Text } from "metabase/ui";

import { SETUP_SSO_CAMPAIGN, UTM_LOCATION } from "../../analytics";

const utmTags = {
  utm_source: "product",
  utm_medium: "docs",
  utm_campaign: SETUP_SSO_CAMPAIGN,
  utm_content: UTM_LOCATION,
};

export const SetupSsoAlert = () => {
  const { url: setupSsoUrl, showMetabaseLinks } = useDocsUrl(
    "embedding/sdk/authentication",
    {
      utm: utmTags,
    },
  );

  return (
    <Alert
      icon={
        <Icon name="warning_triangle_filled" c="text-secondary" size={16} />
      }
      color="warning"
    >
      <Text size="md" lh="lg">
        {showMetabaseLinks
          ? jt`This embed will only work for local testing. To get production ready code, configure ${(
              <Anchor
                key="configure-sso"
                href={setupSsoUrl}
                target="_blank"
                size="md"
                lh="lg"
              >
                {t`JWT SSO or SAML`}
              </Anchor>
            )}.`
          : t`This embed will only work for local testing. To get production ready code, configure JWT SSO or SAML.`}
      </Text>
    </Alert>
  );
};
