import type { ICloudAddOnProduct } from "metabase-types/api/store";

type PurchaseAdvancedTransformsProps = {
  handleModalClose?: VoidFunction;
  addOn: ICloudAddOnProduct;
  freeUnitsIncluded: boolean;
  onSuccess: () => void;
};

export const PurchaseAdvancedTransforms = (
  _props: PurchaseAdvancedTransformsProps,
) => null;
