import cx from "classnames";
import { type PropsWithChildren, useMemo } from "react";
import { t } from "ttag";
import _ from "underscore";

import {
  SettingsPageWrapper,
  SettingsSection,
} from "metabase/admin/components/SettingsSection";
import { useGetBugReportDetailsQuery } from "metabase/api/bug-report";
import { CopyButton } from "metabase/common/components/CopyButton";
import { ExternalLink } from "metabase/common/components/ExternalLink";
import CS from "metabase/css/core/index.css";
import { PLUGIN_SUPPORT } from "metabase/plugins";
import { Box, Code } from "metabase/ui";
import { getBasename } from "metabase/utils/basename";

import S from "./help.module.css";

function navigatorInfo() {
  return _.pick(navigator, "language", "platform", "userAgent", "vendor");
}

// Returns an external-link URL (not an API call) so it goes through `basename`
// to support Metabase deployments at a subpath.
function getConnectionPoolDetailsUrl() {
  const path = "/api/bug-reporting/connection-pool-details";
  return new URL(getBasename() + path, location.origin).href;
}

interface HelpLinkProps {
  title: string;
  description: string;
  link: string;
}

const HelpLink = ({ title, description, link }: HelpLinkProps) => (
  <ExternalLink href={link} target="_blank" className={S.HelpExternalLink}>
    <div>
      <h3 className={CS.textBrand}>{title}</h3>
      <p className={cx(CS.m0, CS.mt1)}>{description}</p>
    </div>
  </ExternalLink>
);

interface InfoBlockProps {
  children: string;
}

const InfoBlock = ({ children }: InfoBlockProps) => (
  <Box p="md" className={cx(CS.bordered, CS.rounded, CS.bgLight, CS.relative)}>
    <Box className={S.InfoBlockButton}>
      <CopyButton value={children} />
    </Box>
    <Code bg="transparent" block>
      {children}
    </Code>
  </Box>
);

export const Help = ({ children }: PropsWithChildren) => {
  const { data: bugReportDetails } = useGetBugReportDetailsQuery();

  const details = useMemo(
    () => ({ "browser-info": navigatorInfo(), ...bugReportDetails }),
    [bugReportDetails],
  );

  const detailString = JSON.stringify(details, null, 2);

  return (
    <SettingsPageWrapper title={t`Help`}>
      {PLUGIN_SUPPORT.isEnabled && <PLUGIN_SUPPORT.SupportSettings />}

      <SettingsSection
        title={t`Diagnostic info`}
        description={t`Please include these details in support requests. Thank you!`}
      >
        <InfoBlock>{detailString}</InfoBlock>
      </SettingsSection>
      <SettingsSection
        title={t`Advanced details`}
        description={t`Click to download`}
      >
        <HelpLink
          title={t`Connection Pool Details`}
          description={t`Information about active and idle connections for all pools`}
          link={getConnectionPoolDetailsUrl()}
        />
      </SettingsSection>
      {/* render 'children' so that the child modal routes can show up */}
      {children}
    </SettingsPageWrapper>
  );
};
