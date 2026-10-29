/** Suppress commercial prompts without mounting their components or running their purchase hooks. */
export function UpsellWrapper<Props extends object>(
  _Component: React.ComponentType<Props>,
) {
  const HiddenUpsell = (_props: Props) => null;
  return HiddenUpsell;
}
