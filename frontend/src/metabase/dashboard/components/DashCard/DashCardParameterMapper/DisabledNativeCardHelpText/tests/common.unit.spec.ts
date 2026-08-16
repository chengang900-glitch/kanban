import { screen } from "__support__/ui";
import { createMockParameter } from "metabase-types/api/mocks";

import { setup } from "./setup";

describe("DashCardParameterMapper > DisabledNativeCardHelpText (OSS)", () => {
  it("should show a help message for native models", () => {
    setup({
      cardType: "model",
    });

    expect(screen.getByText(/Models are data sources/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Learn more" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      parameter: createMockParameter({ type: "id" }),
      message: /variable/,
    },
    {
      parameter: createMockParameter({ type: "string/=" }),
      message: /text variable/,
    },
    {
      parameter: createMockParameter({ type: "number/!=" }),
      message: /number variable/,
    },
    {
      parameter: createMockParameter({ type: "date/all-options" }),
      message: /date variable/,
    },
  ])(
    "should show a help message for $parameter.type",
    ({ parameter, message }) => {
      setup({ parameter });
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Learn how" }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([{ showMetabaseLinks: false }, { showMetabaseLinks: true }])(
    "should hide the parameter help link regardless of `show-metabase-links`: %s",
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
