import { t } from "ttag";

import { Banner } from "metabase/common/components/Banner";
import { Text } from "metabase/ui";
import type { TokenStatus } from "metabase-types/api";

export const PaymentBanner = ({
  tokenStatus,
}: {
  tokenStatus: TokenStatus;
}) => {
  if (!["past-due", "unpaid", "invalid"].includes(tokenStatus.status ?? "")) {
    return null;
  }
  return (
    <Banner
      icon="warning"
      body={
        <Text>
          {t`Some licensed features are unavailable. Contact your administrator.`}
          {tokenStatus.status === "invalid" && tokenStatus["error-details"] && (
            <> {tokenStatus["error-details"]}</>
          )}
        </Text>
      }
    />
  );
};
