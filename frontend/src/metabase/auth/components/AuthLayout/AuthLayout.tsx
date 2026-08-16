import type { ReactNode } from "react";

import { useSetting } from "metabase/common/hooks";
import { Text } from "metabase/ui";
import { getDisplaySiteName } from "metabase/utils/branding";

import { LayoutBody, LayoutCard, LayoutRoot } from "./AuthLayout.styled";
interface AuthLayoutProps {
  children?: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps): JSX.Element => {
  const siteName = getDisplaySiteName(useSetting("site-name"));

  return (
    <LayoutRoot data-testid="login-page">
      <LayoutBody>
        <Text
          data-testid="login-site-name"
          title={siteName}
          maw="30.875rem"
          fz="2rem"
          fw={700}
          lh={1.2}
          ta="center"
          style={{ overflowWrap: "anywhere" }}
        >
          {siteName}
        </Text>
        <LayoutCard>{children}</LayoutCard>
      </LayoutBody>
    </LayoutRoot>
  );
};
