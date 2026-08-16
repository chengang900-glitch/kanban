import { useSetting } from "metabase/common/hooks";
import { DevModeBanner } from "metabase/nav/components/DevModeBanner";
import { ReadOnlyBanner } from "metabase/nav/components/ReadOnlyBanner";
import { useSelector } from "metabase/redux";
import { getUserIsAdmin } from "metabase/selectors/user";

export const AppBanner = () => {
  const isAdmin = useSelector(getUserIsAdmin);
  const migrateReadOnly = useSetting("read-only-mode");
  const isDevMode = useSetting("development-mode?");

  // Most banners are only visible to admins, but DevModeBanner gets shown to all users
  if (!isAdmin) {
    return migrateReadOnly ? (
      <ReadOnlyBanner />
    ) : isDevMode ? (
      <DevModeBanner />
    ) : null;
  }

  if (migrateReadOnly) {
    return <ReadOnlyBanner />;
  }

  if (isDevMode) {
    return <DevModeBanner />;
  }

  // Do not render to admins if the specific conditions haven't been met
  return null;
};
