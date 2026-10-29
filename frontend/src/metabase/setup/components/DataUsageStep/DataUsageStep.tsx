import { getIn } from "icepick";
import { useState } from "react";
import { t } from "ttag";

import { ActionButton } from "metabase/common/components/ActionButton";
import { useDispatch } from "metabase/redux";
import { Box, Flex, Switch } from "metabase/ui";

import { goToNextStep } from "../../actions";
import { useStep } from "../../useStep";
import { ActiveStep } from "../ActiveStep";
import { InactiveStep } from "../InactiveStep";
import type { NumberedStepProps } from "../types";

export const DataUsageStep = ({
  stepLabel,
}: NumberedStepProps): JSX.Element => {
  const { isStepActive, isStepCompleted } = useStep("data_usage");
  const [errorMessage, setErrorMessage] = useState<string>();
  const isTrackingAllowed = false;
  const dispatch = useDispatch();

  const handleStepSubmit = async () => {
    try {
      await dispatch(goToNextStep()).unwrap();
    } catch (error) {
      setErrorMessage(getSubmitError(error));
      throw error;
    }
  };

  if (!isStepActive) {
    return (
      <InactiveStep
        title={getStepTitle(isTrackingAllowed, isStepCompleted)}
        label={stepLabel}
        isStepCompleted={isStepCompleted}
      />
    );
  }

  return (
    <ActiveStep
      title={getStepTitle(isTrackingAllowed, isStepCompleted)}
      label={stepLabel}
    >
      <Flex
        align="center"
        mr="xxl"
        mb="lg"
        p="lg"
        bd="2px solid var(--mb-color-border-neutral)"
        bdrs="sm"
      >
        <Switch
          flex="0 0 auto"
          checked={isTrackingAllowed}
          disabled
          aria-labelledby="anonymous-usage-events-label"
        />
        <Box id="anonymous-usage-events-label" c="text-secondary" ml="sm">
          {t`Allow Metabase to anonymously collect usage events`}
        </Box>
      </Flex>
      <ActionButton
        normalText={t`Finish`}
        activeText={t`Finishing…`}
        failedText={t`Failed`}
        successText={t`Success`}
        variant="filled"
        type="button"
        actionFn={handleStepSubmit}
      />
      {errorMessage && (
        <Box c="feedback-negative" mt="sm">
          {errorMessage}
        </Box>
      )}
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
