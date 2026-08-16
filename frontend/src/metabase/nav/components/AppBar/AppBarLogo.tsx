import type { MouseEvent } from "react";

import { useSetting } from "metabase/common/hooks";
import { useIsAtHomepageDashboard } from "metabase/common/hooks/use-is-at-homepage-dashboard";
import { Text } from "metabase/ui";
import { getDisplaySiteName } from "metabase/utils/branding";

import { LogoLink } from "./AppBarLogo.styled";

export interface AppBarLogoProps {
  isSmallAppBar?: boolean;
  isLogoVisible?: boolean;
  isNavBarEnabled?: boolean;
  isGitSyncVisible?: boolean;
  onLogoClick?: () => void;
}

export function AppBarLogo({
  isLogoVisible,
  isSmallAppBar,
  isNavBarEnabled,
  isGitSyncVisible,
  onLogoClick,
}: AppBarLogoProps): JSX.Element | null {
  const isAtHomepageDashboard = useIsAtHomepageDashboard();
  const siteName = getDisplaySiteName(useSetting("site-name"));

  if (!isLogoVisible) {
    return null;
  }

  const handleClick = (event: MouseEvent) => {
    // Prevent navigating to the dashboard homepage when a user is already there
    // https://github.com/metabase/metabase/issues/43800
    if (isAtHomepageDashboard) {
      event.preventDefault();
    }
    onLogoClick?.();
  };

  return (
    <LogoLink
      to="/"
      isSmallAppBar={Boolean(isSmallAppBar)}
      isGitSyncVisible={Boolean(isGitSyncVisible)}
      onClick={handleClick}
      disabled={!isNavBarEnabled}
      data-testid="main-logo-link"
    >
      <Text data-testid="main-logo" title={siteName} fz="lg" fw={700} truncate>
        {siteName}
      </Text>
    </LogoLink>
  );
}
