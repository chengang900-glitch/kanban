type UpsellCardLeftColumnContentProps = {
  campaign: string;
  location: string;
  title: string;
  description: string;
  bulletPoints?: string[];
  upgradeOnClick?: () => void;
  upgradeUrl?: string;
};

export type UpsellCardContentProps = UpsellCardLeftColumnContentProps & {
  image?: string;
  variant?: "image-full-height" | "image-card";
};

export const UpsellCardContent = (_props: UpsellCardContentProps) => null;
