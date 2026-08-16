import { screen } from "__support__/ui";

import { setup } from "./setup";

describe("ImpossibleToCreateModelModal (OSS)", () => {
  it("should hide help links when `show-metabase-links: true`", () => {
    setup({ showMetabaseLinks: true });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(/It's okay to use SQL snippets/),
    ).toBeInTheDocument();
  });

  it("should hide help links when `show-metabase-links: false`", () => {
    setup({ showMetabaseLinks: false });

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(/It's okay to use SQL snippets/),
    ).toBeInTheDocument();
  });
});
