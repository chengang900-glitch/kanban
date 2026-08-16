import { screen } from "__support__/ui";

import { setup } from "./setup";

describe("HomeHelpCard (OSS)", () => {
  it("should hide Metabase help despite customizing the application name", () => {
    setup({ applicationName: "My app analytics" });
    expect(screen.queryByText("Metabase tips")).not.toBeInTheDocument();
  });

  it("should hide the help link when `show-metabase-links: true`", () => {
    setup({ showMetabaseLinks: true });
    expect(screen.queryByText("Metabase tips")).not.toBeInTheDocument();
  });

  it("should hide the help link when `show-metabase-links: false`", () => {
    setup({ showMetabaseLinks: false });
    expect(screen.queryByText("Metabase tips")).not.toBeInTheDocument();
  });
});
