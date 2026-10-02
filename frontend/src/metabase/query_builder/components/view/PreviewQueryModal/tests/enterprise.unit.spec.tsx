import { screen } from "__support__/ui";

import type { SetupOpts } from "./setup";
import { setup as baseSetup } from "./setup";

function setup(opts: SetupOpts) {
  baseSetup({ ...opts });
}

describe("PreviewQueryModal (EE without token)", () => {
  it("should hide the external help link when `show-metabase-links: true", async () => {
    setup({ showMetabaseLinks: true });

    expect(await screen.findByText("Query preview")).toBeInTheDocument();
    expect(
      screen.queryByText("Learn how to debug SQL errors"),
    ).not.toBeInTheDocument();
  });

  it("should hide the external help link when `show-metabase-links: false", async () => {
    setup({ showMetabaseLinks: false });

    expect(await screen.findByText("Query preview")).toBeInTheDocument();
    expect(
      screen.queryByText("Learn how to debug SQL errors"),
    ).not.toBeInTheDocument();
  });
});
