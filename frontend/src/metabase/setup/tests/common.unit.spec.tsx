import userEvent from "@testing-library/user-event";

import { screen } from "__support__/ui";
import { createMockSettingDefinition } from "metabase-types/api/mocks";

import {
  clickNextStep,
  expectSectionToHaveLabel,
  expectSectionsToHaveLabelsInOrder,
  getLastSettingsPutPayload,
  getSection,
  selectUsageReason,
  setup,
  skipWelcomeScreen,
  submitUserInfoStep,
} from "./setup";

describe("setup (OSS)", () => {
  it("default step order should be correct", async () => {
    await setup();
    await skipWelcomeScreen();
    expectSectionToHaveLabel("What should we call you?", "1");
    expectSectionToHaveLabel("What will you use Dashboard for?", "2");
    expectSectionToHaveLabel("Add your data", "3");
    expectSectionToHaveLabel("Usage data preferences", "4");

    expectSectionsToHaveLabelsInOrder();
  });

  it("should keep steps in order through the whole setup", async () => {
    await setup();
    await skipWelcomeScreen();
    expectSectionsToHaveLabelsInOrder({ from: 0 });

    await submitUserInfoStep();
    expectSectionsToHaveLabelsInOrder({ from: 1 });

    await clickNextStep(); // Usage question
    expectSectionsToHaveLabelsInOrder({ from: 2 });

    await userEvent.click(screen.getByText("Continue with sample data"));
    expectSectionsToHaveLabelsInOrder({ from: 3 });
  });

  describe("Usage question", () => {
    async function setupForUsageQuestion() {
      await setup();
      await skipWelcomeScreen();
      await submitUserInfoStep();
    }

    describe("when selecting 'Self service'", () => {
      it("should keep the 'Add your data' step", async () => {
        await setupForUsageQuestion();

        expect(
          screen.queryByRole("radio", {
            name: "Embedding analytics into my application",
          }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("radio", { name: "A bit of both" }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("radio", { name: "Not sure yet" }),
        ).not.toBeInTheDocument();

        await selectUsageReason("self-service-analytics");
        await clickNextStep();

        expect(screen.getByText("Add your data")).toBeInTheDocument();

        expect(getSection("Add your data")).toHaveAttribute(
          "aria-current",
          "step",
        );

        expectSectionToHaveLabel("Add your data", "3");
        expectSectionToHaveLabel("Usage data preferences", "4");
      });
    });

    describe("when selecting 'Embedding'", () => {
      it("should hide the 'Add your data' step", async () => {
        await setupForUsageQuestion();
        await selectUsageReason("embedding");
        await clickNextStep();

        expect(screen.queryByText("Add your data")).not.toBeInTheDocument();

        expect(getSection("Usage data preferences")).toHaveAttribute(
          "aria-current",
          "step",
        );

        expectSectionToHaveLabel("Usage data preferences", "3");
      });
    });

    describe("when selecting 'A bit of both'", () => {
      it("should keep the 'Add your data' step", async () => {
        await setupForUsageQuestion();
        await selectUsageReason("both");
        await clickNextStep();

        expect(screen.getByText("Add your data")).toBeInTheDocument();

        expect(getSection("Add your data")).toHaveAttribute(
          "aria-current",
          "step",
        );

        expectSectionToHaveLabel("Add your data", "3");
        expectSectionToHaveLabel("Usage data preferences", "4");
      });
    });

    describe("when selecting 'Not sure yet'", () => {
      it("should keep the 'Add your data' step", async () => {
        await setupForUsageQuestion();
        await selectUsageReason("not-sure");
        await clickNextStep();

        expect(screen.getByText("Add your data")).toBeInTheDocument();

        expect(getSection("Add your data")).toHaveAttribute(
          "aria-current",
          "step",
        );

        expectSectionToHaveLabel("Add your data", "3");
        expectSectionToHaveLabel("Usage data preferences", "4");
      });
    });
  });

  describe("embedding homepage flags", () => {
    it("should set the correct flags when interested in embedding", async () => {
      await setup();
      await skipWelcomeScreen();
      await submitUserInfoStep();

      await selectUsageReason("embedding");
      await clickNextStep();

      await userEvent.click(screen.getByText("Finish"));

      expect(await getLastSettingsPutPayload()).toEqual({
        "embedding-homepage": "visible",
        "setup-embedding-autoenabled": true,
        "setup-license-active-at-setup": false,
      });
    });

    it("should not set 'embedding-homepage' when not interested in embedding", async () => {
      await setup();
      await skipWelcomeScreen();
      await submitUserInfoStep();

      await selectUsageReason("self-service-analytics");
      await clickNextStep();

      await userEvent.click(screen.getByText("Continue with sample data"));

      await userEvent.click(screen.getByText("Finish"));

      const flags = await getLastSettingsPutPayload();

      expect(flags["embedding-homepage"]).toBeUndefined();
      expect(flags["enable-embedding"]).toBeUndefined();
      expect(flags["setup-embedding-autoenabled"]).toBeUndefined();
    });

    it("should not autoenable embedding if it was set by an env", async () => {
      await setup({
        settingOverrides: [
          createMockSettingDefinition({
            key: "enable-embedding",
            value: false,
            is_env_setting: true,
          }),
        ],
      });
      await skipWelcomeScreen();
      await submitUserInfoStep();

      await selectUsageReason("embedding");
      await clickNextStep();

      await userEvent.click(screen.getByText("Finish"));

      const flags = await getLastSettingsPutPayload();

      expect(flags).toEqual({
        "embedding-homepage": "visible",
        "setup-embedding-autoenabled": true,
        "setup-license-active-at-setup": false,
      });
    });
  });

  it("should keep newsletter opt-in disabled", async () => {
    await setup();
    await skipWelcomeScreen();
    await submitUserInfoStep();
    await selectUsageReason("self-service-analytics");
    await clickNextStep();
    await userEvent.click(screen.getByText("Continue with sample data"));

    await userEvent.click(screen.getByText("Finish"));

    const newsletterSwitch = screen.getByRole("switch", {
      name: "Get infrequent emails about new releases and feature updates.",
    });

    expect(newsletterSwitch).not.toBeChecked();
    expect(newsletterSwitch).toBeDisabled();
    expect(screen.getByText("进入数据看板")).toBeInTheDocument();
  });
});
