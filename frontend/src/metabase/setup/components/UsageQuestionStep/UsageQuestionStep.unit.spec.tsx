import userEvent from "@testing-library/user-event";

import { createMockSetupState, createMockState } from "__support__/state";
import { renderWithProviders, screen } from "__support__/ui";

import { UsageQuestionStep } from "./UsageQuestionStep";

it("locks the first use case for mouse and keyboard input", async () => {
  renderWithProviders(<UsageQuestionStep stepLabel={2} />, {
    storeInitialState: createMockState({
      setup: createMockSetupState({ step: "usage_question" }),
    }),
  });
  const radios = screen.getAllByRole("radio");
  expect(radios).toHaveLength(4);
  for (const radio of radios) {
    expect(radio).toBeDisabled();
    await userEvent.click(radio);
  }
  expect(radios[0]).toBeChecked();
  for (const radio of radios.slice(1)) {
    expect(radio).not.toBeChecked();
  }
  await userEvent.tab();
  expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  expect(radios[0]).toBeChecked();
});
