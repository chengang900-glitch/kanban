import { screen } from "__support__/ui";

import type { SetupOpts } from "./setup";
import { setup as baseSetup } from "./setup";

function setup(opts: SetupOpts) {
  baseSetup({ ...opts });
}

describe("NewModelOptions (EE without token)", () => {
  it("should render no data access notice when instance have no database access", async () => {
    setup({ canCreateQueries: false });

    expect(
      await screen.findByText("Metabase is no fun without any data"),
    ).toBeInTheDocument();
  });

  describe("has data access", () => {
    it("should render options for creating a model", async () => {
      setup({ canCreateQueries: true, canCreateNativeQueries: true });

      expect(
        await screen.findByText("Use the notebook editor"),
      ).toBeInTheDocument();
      expect(await screen.findByText("Use a native query")).toBeInTheDocument();
    });

    it("should not render the model help link", () => {
      setup({ canCreateQueries: true, showMetabaseLinks: true });

      expect(screen.queryByText("What's a model?")).not.toBeInTheDocument();
    });
  });
});
