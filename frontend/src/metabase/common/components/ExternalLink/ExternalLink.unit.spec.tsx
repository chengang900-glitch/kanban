import userEvent from "@testing-library/user-event";

import { render, screen } from "__support__/ui";

import { ExternalLink } from "./ExternalLink";

describe("ExternalLink", () => {
  it("should receive focus on tab", async () => {
    render(<ExternalLink href="/">Link</ExternalLink>);
    await userEvent.tab();

    expect(screen.getByRole("link")).toHaveFocus();
  });
  it.each([
    "Learn more",
    "Learn More.",
    "Learn more about nested queries",
    "了解更多",
    "了解有关嵌套查询的更多信息",
  ])("hides the help link %s", (label) => {
    render(
      <ExternalLink href="https://www.metabase.com/docs/">
        {label}
      </ExternalLink>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("hides nested labels without hiding ordinary links to the same URL", () => {
    render(
      <>
        <ExternalLink href="/docs">
          <span>Learn more</span>
          <span aria-hidden> ↗</span>
        </ExternalLink>
        <ExternalLink href="/docs">Documentation</ExternalLink>
      </>,
    );
    expect(
      screen.queryByRole("link", { name: /Learn more/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "/docs",
    );
  });
});
