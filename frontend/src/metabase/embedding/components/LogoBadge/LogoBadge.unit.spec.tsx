import { render, screen } from "__support__/ui";

import { LogoBadge } from ".";

describe("LogoBadge", () => {
  it("does not render a Powered by Metabase footer or outbound link", () => {
    setup();

    expect(screen.queryByText("Powered by")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

function setup() {
  render(<LogoBadge dark={false} />);
}
