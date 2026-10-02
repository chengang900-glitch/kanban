import { renderWithProviders, screen } from "__support__/ui";

import { LockedTransformsBanner } from "./LockedTransformsBanner";

describe("LockedTransformsBanner", () => {
  it("does not render commercial promotion", () => {
    renderWithProviders(<LockedTransformsBanner />);
    expect(screen.queryByText(/subscription/i)).not.toBeInTheDocument();
  });
});
