import type { BoxProps } from "metabase/ui";

import type { UpsellCardProps } from "./UpsellCard";

export const UpsellUsageAnalytics = (
  _props: BoxProps &
    Omit<
      UpsellCardProps,
      "children" | "title" | "buttonText" | "buttonLink" | "campaign"
    >,
) => null;
