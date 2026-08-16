import { renderWithProviders, screen } from "__support__/ui";

import { LockedTransformsHoverCard } from "./LockedTransformsHoverCard";

function setup() {
  renderWithProviders(
    <LockedTransformsHoverCard>
      <button>Run transform</button>
    </LockedTransformsHoverCard>,
  );
}

describe("LockedTransformsHoverCard", () => {
  it("renders only its child without commercial promotion", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Run transform" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
