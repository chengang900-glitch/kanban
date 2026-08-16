import { Route } from "react-router";

import { renderWithProviders, screen } from "__support__/ui";
import {
  createMockLocation,
  createMockRoutingState,
  createMockSettingsState,
} from "metabase/redux/store/mocks";
import {
  createMockSettings,
  createMockTokenFeatures,
  createMockUser,
} from "metabase-types/api/mocks";

import { EmbeddingNav } from "./EmbeddingNav";

const setup = ({
  hasSimpleEmbedding = false,
}: {
  hasSimpleEmbedding?: boolean;
} = {}) => {
  const initialRoute = "/admin/embedding/themes";
  const settings = createMockSettings({
    "token-features": createMockTokenFeatures({
      embedding_simple: hasSimpleEmbedding,
    }),
  });

  renderWithProviders(<Route path="*" component={EmbeddingNav} />, {
    withRouter: true,
    initialRoute,
    storeInitialState: {
      currentUser: createMockUser({ is_superuser: true }),
      routing: createMockRoutingState({
        locationBeforeTransitions: createMockLocation({
          pathname: initialRoute,
        }),
      }),
      settings: createMockSettingsState(settings),
    },
  });
};

describe("EmbeddingNav", () => {
  it("hides the Themes upsell entry for OSS/starter users", () => {
    setup({ hasSimpleEmbedding: false });

    expect(
      screen.queryByRole("link", { name: /Themes/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the Themes entry when the feature is available", () => {
    setup({ hasSimpleEmbedding: true });

    expect(screen.getByRole("link", { name: /Themes/ })).toBeInTheDocument();
  });
});
