import { createMockState } from "__support__/state";
import { userApi } from "metabase/api";
import type { DispatchFn } from "metabase/redux";
import type { InviteInfo, State } from "metabase/redux/store";
import { settingsApi } from "metabase/settings";

import { submitUsageReason, submitUserInvite, updateTracking } from "./actions";
import { reducer } from "./reducers";

const { trackUserInvited } = jest.requireMock("metabase/common/analytics");
const mockCreateUser = jest.fn();
userApi.endpoints.createUser.initiate = mockCreateUser;

const mockInviteInfo: InviteInfo = {
  email: "john@doe.com",
  first_name: "John",
  last_name: "Smith",
};

describe("submitUserInvite", () => {
  let dispatch: DispatchFn;
  let getState: () => State;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should dispatch createUser with correct parameters", async () => {
    const thunk = submitUserInvite(mockInviteInfo);
    await thunk(dispatch, getState, undefined);
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining(mockInviteInfo),
    );
  });

  it("should handle invite params properly", async () => {
    const incompleteInviteInfo: InviteInfo = {
      email: "test@example.com",
      first_name: null,
      last_name: null,
    };
    const thunk = submitUserInvite(incompleteInviteInfo);

    await thunk(dispatch, getState, undefined);

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "test@example.com",
      first_name: undefined,
      last_name: undefined,
      source: "setup",
    });
  });

  it("tracks user_invited from setup when the create succeeds", async () => {
    // Unjustified type cast. FIXME
    (dispatch as unknown as jest.Mock).mockReturnValue({
      unwrap: () => Promise.resolve(),
    });

    const thunk = submitUserInvite(mockInviteInfo);
    await thunk(dispatch, getState, undefined);

    expect(trackUserInvited).toHaveBeenCalledWith({
      triggeredFrom: "setup",
      targetId: null,
      result: "success",
      eventDetail: "new_user",
    });
    expect(trackUserInvited).toHaveBeenCalledTimes(1);
  });
});

describe("locked setup preferences", () => {
  it("never sends an enabling tracking request, including from stale callers", async () => {
    const initiate = jest.spyOn(
      settingsApi.endpoints.updateSetting,
      "initiate",
    );
    const dispatch = jest
      .fn()
      .mockReturnValue({ unwrap: () => Promise.resolve() });
    await updateTracking(true)(dispatch, () => createMockState(), undefined);
    expect(initiate).toHaveBeenCalledWith({
      key: "anon-tracking-enabled",
      value: false,
    });
    const initial = reducer(undefined, { type: "init" });
    expect(initial.isTrackingAllowed).toBe(false);
    expect(
      reducer(initial, updateTracking.fulfilled(undefined, "request", true))
        .isTrackingAllowed,
    ).toBe(false);
    initiate.mockRestore();
  });

  it("keeps the self-service flow when an old caller submits embedding", () => {
    const initial = reducer(undefined, { type: "init" });
    expect(initial.usageReason).toBe("self-service-analytics");
    expect(
      reducer(initial, submitUsageReason.pending("request", "embedding"))
        .usageReason,
    ).toBe("self-service-analytics");
  });
});
