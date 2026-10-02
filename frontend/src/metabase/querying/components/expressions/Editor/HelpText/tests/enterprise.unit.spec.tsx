import { screen } from "@testing-library/react";

import type { SetupOpts } from "./setup";
import { setup as baseSetup } from "./setup";

async function setup(opts: SetupOpts) {
  await baseSetup({ ...opts });
}

describe("ExpressionEditorHelpText (EE without token)", () => {
  describe("Metabase links", () => {
    it("should hide the external help link when `show-metabase-links: true`", async () => {
      await setup({
        enclosingFunction: { name: "concat" },
        showMetabaseLinks: true,
      });

      expect(
        screen.queryByRole("img", { name: "reference icon" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
    });

    it("should hide the external help link when `show-metabase-links: false`", async () => {
      await setup({
        enclosingFunction: { name: "concat" },
        showMetabaseLinks: false,
      });

      expect(
        screen.queryByRole("img", { name: "reference icon" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
    });
  });
});
