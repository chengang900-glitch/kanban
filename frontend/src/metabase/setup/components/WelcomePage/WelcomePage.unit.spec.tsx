import fetchMock from "fetch-mock";

import { renderWithProviders, screen } from "__support__/ui";
import {
  createMockSettingsState,
  createMockState,
} from "metabase/redux/store/mocks";

import { WelcomePage } from "./WelcomePage";

const setup = () => {
  fetchMock.get("path:/app/locales/en.json", {
    charset: "utf-8",
    headers: {
      language: "en",
      "plural-forms": "nplurals=2; plural=(n != 1);",
    },
    translations: { "": { "": {} } },
  });

  const state = createMockState({
    settings: createMockSettingsState({
      "available-locales": [["en", "English"]],
    }),
  });

  renderWithProviders(<WelcomePage />, { storeInitialState: state });
};

describe("WelcomePage", () => {
  it("should render before the timeout when the locale is loaded", async () => {
    setup();

    expect(screen.queryByText("开始使用")).not.toBeInTheDocument();
    expect(await screen.findByText("开始使用")).toBeInTheDocument();
    expect(screen.getByText("欢迎使用数据看板")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to Dashboard")).not.toBeInTheDocument();
    expect(
      screen.queryByText("our getting started guide"),
    ).not.toBeInTheDocument();
  });
});
