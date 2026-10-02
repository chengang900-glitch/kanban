import { screen } from "@testing-library/react";

import type { SetupOpts } from "./setup";
import { setup as baseSetup } from "./setup";

async function setup(opts: SetupOpts) {
  await baseSetup({
    enterprisePlugins: ["whitelabel"],
    tokenFeatures: { whitelabel: true },
    ...opts,
  });
}

describe("ExpressionEditorHelpText (EE with token)", () => {
  describe("Metabase links", () => {
    it("should hide the external help link when `show-metabase-links: true`", async () => {
      await setup({
        enclosingFunction: { name: "concat" },
        showMetabaseLinks: true,
      });

      // Wait for the async-formatted example so HighlightExpressionParts
      // settles before the test ends.
      await screen.findByText('concat([Last Name], ", ", [First Name])');

      expect(
        screen.queryByRole("img", { name: "reference icon" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
    });

    it("should not show a help link when `show-metabase-links: false`", async () => {
      await setup({
        enclosingFunction: { name: "concat" },
        showMetabaseLinks: false,
      });

      // Wait for the async-formatted example so HighlightExpressionParts
      // settles before the test ends.
      await screen.findByText('concat([Last Name], ", ", [First Name])');

      expect(
        screen.queryByRole("img", { name: "reference icon" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Learn more")).not.toBeInTheDocument();
    });
  });
});
