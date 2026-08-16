import { t } from "ttag";

import { UpsellBigCard } from "metabase/common/components/upsells/components";
import { UPGRADE_URL } from "metabase/common/components/upsells/constants";
import { useHasTokenFeature } from "metabase/common/hooks";
import { PLUGIN_ADMIN_SETTINGS } from "metabase/plugins";

export const UpsellWhitelabel = ({ source }: { source: string }) => {
  const isWhitelabeled = useHasTokenFeature("whitelabel");
  const campaign = "whitelabel";
  const { triggerUpsellFlow } = PLUGIN_ADMIN_SETTINGS.useUpsellFlow({
    campaign,
    location: source,
  });
  if (isWhitelabeled) {
    return null;
  }

  return (
    <UpsellBigCard
      title={t`Make Metabase look like you`}
      campaign={campaign}
      buttonText={t`Try for free`}
      buttonLink={UPGRADE_URL}
      source={source}
      illustrationSrc="app/assets/img/upsell-whitelabel.png"
      onClick={triggerUpsellFlow}
    >
      {t`Customize your internal or customer-facing analytics with your brand name, logo, colors, font and more, and hide giveaway Metabase elements.`}
    </UpsellBigCard>
  );
};
