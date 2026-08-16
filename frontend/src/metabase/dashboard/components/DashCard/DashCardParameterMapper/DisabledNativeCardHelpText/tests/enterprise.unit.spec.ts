import { screen } from "__support__/ui";

import type { SetupOpts } from "./setup";
import { setup as baseSetup } from "./setup";

function setup(opts: SetupOpts) {
  baseSetup({ ...opts });
}

describe("DashCardParameterMapper > DisabledNativeCardHelpText (EE without token)", () => {
  it.each([{ showMetabaseLinks: false }, { showMetabaseLinks: true }])(
    "should hide the parameter help link regardless of showMetabaseLinks = %s",
    ({ showMetabaseLinks }) => {
      setup({ showMetabaseLinks });
      expect(
        screen.queryByRole("link", { name: "Learn how" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([{ showMetabaseLinks: false }, { showMetabaseLinks: true }])(
    "should hide the model help link regardless of `show-metabase-links`: %s",
    ({ showMetabaseLinks }) => {
      setup({ cardType: "model", showMetabaseLinks });
      expect(
        screen.queryByRole("link", { name: "Learn more" }),
      ).not.toBeInTheDocument();
    },
  );
});
