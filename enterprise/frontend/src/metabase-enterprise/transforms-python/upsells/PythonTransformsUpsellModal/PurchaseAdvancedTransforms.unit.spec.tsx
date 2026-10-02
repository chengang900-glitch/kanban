import { renderWithProviders, screen } from "__support__/ui";
import { mockAdvancedTransformsCloudAddOn } from "metabase-types/api/mocks/add-ons";

import { PurchaseAdvancedTransforms } from "./PurchaseAdvancedTransforms";

describe("PurchaseAdvancedTransforms", () => {
  it("does not render commercial promotion", () => {
    renderWithProviders(
      <PurchaseAdvancedTransforms
        addOn={mockAdvancedTransformsCloudAddOn}
        freeUnitsIncluded
        onSuccess={jest.fn()}
      />,
    );

    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument();
  });
});
