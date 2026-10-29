import cx from "classnames";
import type { MouseEvent } from "react";

import { Link } from "metabase/common/components/Link";
import { useIsAtHomepageDashboard } from "metabase/common/hooks/use-is-at-homepage-dashboard";
import { useSetting } from "metabase/settings";
import { Text } from "metabase/ui";
import { getDisplaySiteName } from "metabase/utils/branding";

import S from "./AppBar.module.css";

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
    <Link
      to="/"
      style={{ maxWidth: isSmallAppBar ? "8rem" : "14rem" }}
      className={cx(S.logoLink, {
        [S.logoLinkSpaced]: !isSmallAppBar && !isGitSyncVisible,
        [S.logoLinkSpacedGitSync]: !isSmallAppBar && isGitSyncVisible,
      })}
      onClick={handleClick}
      disabled={!isNavBarEnabled}
      data-testid="main-logo-link"
    >
      <Text data-testid="main-logo" title={siteName} fz="lg" fw={700} truncate>
        {siteName}
      </Text>
    </Link>
  );
}
