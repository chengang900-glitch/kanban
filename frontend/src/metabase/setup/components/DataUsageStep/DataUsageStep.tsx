import { getIn } from "icepick";
import { useState } from "react";
import { t } from "ttag";

import { ActionButton } from "metabase/common/components/ActionButton";
import { useDispatch } from "metabase/redux";

import { goToNextStep, updateTracking } from "../../actions";
import { useStep } from "../../useStep";
import { ActiveStep } from "../ActiveStep";
import { InactiveStep } from "../InactiveStep";
import type { NumberedStepProps } from "../types";

import {
  StepError,
  StepToggle,
  StepToggleContainer,
  StepToggleLabel,
} from "./DataUsageStep.styled";

export const DataUsageStep = ({
  stepLabel,
}: NumberedStepProps): JSX.Element => {
  const { isStepActive, isStepCompleted } = useStep("data_usage");
  const [errorMessage, setErrorMessage] = useState<string>();
  const dispatch = useDispatch();

  const handleStepSubmit = async () => {
    try {
      await dispatch(updateTracking(false)).unwrap();
      await dispatch(goToNextStep()).unwrap();
    } catch (error) {
      setErrorMessage(getSubmitError(error));
      throw error;
    }
  };

  if (!isStepActive) {
    return (
      <InactiveStep
        title={getStepTitle(false, isStepCompleted)}
        label={stepLabel}
        isStepCompleted={isStepCompleted}
      />
    );
  }

  return (
    <ActiveStep
      title={getStepTitle(false, isStepCompleted)}
      label={stepLabel}
    >
      <StepToggleContainer>
        <StepToggle
          value={false}
          disabled
          aria-labelledby="anonymous-usage-events-label"
        />
        <StepToggleLabel id="anonymous-usage-events-label">
          {t`Allow Dashboard to anonymously collect usage events`}
        </StepToggleLabel>
      </StepToggleContainer>
      <ActionButton
        normalText={t`Finish`}
        activeText={t`Finishing…`}
        failedText={t`Failed`}
        successText={t`Success`}
        variant="filled"
        type="button"
        actionFn={handleStepSubmit}
      />
      {errorMessage && <StepError>{errorMessage}</StepError>}
    </ActiveStep>
  );
};

const getStepTitle = (
  isTrackingAllowed: boolean,
  isStepCompleted: boolean,
): string => {
  if (!isStepCompleted) {
    return t`Usage data preferences`;
  } else if (isTrackingAllowed) {
    return t`Thanks for helping us improve`;
  } else {
    return t`We won't collect any usage events`;
  }
};

const getSubmitError = (error: unknown): string => {
  const message = getIn(error, ["data", "message"]);
  const errors = getIn(error, ["data", "errors"]);

  if (message) {
    return String(message);
  } else if (errors) {
    return String(Object.values(errors)[0]);
  } else {
    return t`An error occurred`;
  }
};
