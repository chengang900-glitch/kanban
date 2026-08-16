import { screen } from "__support__/ui";

import { setup } from "./setup";

describe("EmptyFormPlaceholder (OSS)", () => {
  it("should hide help link when `show-metabase-links: true`", () => {
    setup({ showMetabaseLinks: true });
    expect(
      screen.getByText("Build custom forms and business logic."),
    ).toBeInTheDocument();
    expect(screen.queryByText("See an example")).not.toBeInTheDocument();
  });

  it("should hide help link when `show-metabase-links: false`", () => {
    setup({ showMetabaseLinks: false });
    expect(
      screen.getByText("Build custom forms and business logic."),
    ).toBeInTheDocument();
    expect(screen.queryByText("See an example")).not.toBeInTheDocument();
  });
});
