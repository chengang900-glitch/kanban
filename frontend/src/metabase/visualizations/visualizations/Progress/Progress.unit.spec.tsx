import { renderWithProviders, screen } from "__support__/ui";
import { NumberColumn } from "__support__/visualizations";
import Visualization from "metabase/visualizations/components/Visualization";
import { registerVisualizations } from "metabase/visualizations/register";
import { createMockSingleSeries } from "metabase-types/api/mocks";

registerVisualizations();

const setup = (value: number, goal = 100) => {
  const series = [
    createMockSingleSeries(
      {
        display: "progress",
        visualization_settings: {
          "progress.value": "value",
          "progress.goal": goal,
          "progress.color": "#509EE3",
        },
      },
      {
        data: {
          cols: [NumberColumn({ name: "value" })],
          rows: [[value]],
        },
      },
    ),
  ];

  return renderWithProviders(
    <Visualization rawSeries={series} width={400} height={240} />,
  );
};

describe("Progress", () => {
  it("exposes configured colors and the incomplete percentage", async () => {
    setup(60);
    await screen.findByTestId("progress-bar-root");

    expect(screen.getByTestId("progress-bar-root")).toHaveStyle({
      "--progress-chart-color": "#509EE3",
    });
    expect(screen.getByTestId("progress-bar-fill")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar-percent")).toHaveTextContent("60%");
    expect(screen.getByTestId("progress-bar-pointer")).toBeInTheDocument();
  });

  it("preserves the completed status instead of showing a percentage", async () => {
    setup(100);
    await screen.findByTestId("progress-bar-root");

    expect(
      screen.queryByTestId("progress-bar-percent"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("progress-bar-status")).toBeInTheDocument();
  });
});

describe("Progress boundaries", () => {
  it.each([0, 1, 5])(
    "does not add a badge that would inflate a %s%% segment",
    async (value) => {
      setup(value);
      expect(await screen.findByTestId("progress-bar-fill")).toHaveStyle({
        width: `${value}%`,
      });
      expect(
        screen.queryByTestId("progress-bar-percent"),
      ).not.toBeInTheDocument();
    },
  );
  it("preserves the native over-goal status", async () => {
    setup(125);
    await screen.findByTestId("progress-bar-status");
    expect(
      screen.queryByTestId("progress-bar-percent"),
    ).not.toBeInTheDocument();
  });
});
