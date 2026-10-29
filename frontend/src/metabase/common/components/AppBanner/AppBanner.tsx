import { getUserIsAdmin } from "metabase/current-user";
import { PLUGIN_SECURITY_CENTER } from "metabase/plugins";
import { useSelector } from "metabase/redux";
import { useSetting } from "metabase/settings";

import { DevModeBanner } from "./DevModeBanner";
import { PaymentBanner } from "./PaymentBanner/PaymentBanner";
import { ReadOnlyBanner } from "./ReadOnlyBanner";

export const AppBanner = () => {
  const isAdmin = useSelector(getUserIsAdmin);
  const isHosted = useSetting("is-hosted?");
  const tokenStatus = useSetting("token-status");
  const migrateReadOnly = useSetting("read-only-mode");
  const isDevMode = useSetting("development-mode?");

  if (migrateReadOnly) {
    return <ReadOnlyBanner />;
  }
  if (
    isAdmin &&
    !isHosted &&
    tokenStatus &&
    ["past-due", "unpaid", "invalid"].includes(tokenStatus.status ?? "")
  ) {
    return <PaymentBanner tokenStatus={tokenStatus} />;
  }
  if (isAdmin && PLUGIN_SECURITY_CENTER.isEnabled) {
    const { SecurityCenterBanner } = PLUGIN_SECURITY_CENTER;
    return <SecurityCenterBanner />;
  }
  return isDevMode ? <DevModeBanner /> : null;
};
