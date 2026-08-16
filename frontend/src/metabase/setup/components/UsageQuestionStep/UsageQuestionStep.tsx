import { useState } from "react";
import { t } from "ttag";

import { useDispatch } from "metabase/redux";
import { Button, Divider, Radio, Stack } from "metabase/ui";
import type { UsageReason } from "metabase-types/api";

import { submitUsageReason } from "../../actions";
import { useStep } from "../../useStep";
import { ActiveStep } from "../ActiveStep";
import { InactiveStep } from "../InactiveStep";
import type { NumberedStepProps } from "../types";

const COMPLETED_STEP_TITLE: Record<UsageReason, string> = {
  get "self-service-analytics"() {
    return t`I’ll do self-service analytics for my own company`;
  },
  get embedding() {
    return t`I’ll embed analytics into my application`;
  },
  get both() {
    return t`I’ll do a bit of both self-service and embedding`;
  },
  get "not-sure"() {
    return t`I’m not sure yet`;
  },
};

export const UsageQuestionStep = ({ stepLabel }: NumberedStepProps) => {
  const { isStepActive, isStepCompleted } = useStep("usage_question");
  const [usageReason, setUsageReason] = useState<UsageReason>(
    "self-service-analytics",
  );

  const dispatch = useDispatch();

  const handleSubmit = () => {
    dispatch(submitUsageReason(usageReason));
  };

  const handleChange = (value: string) => {
    setUsageReason(value as UsageReason);
  };

  if (!isStepActive) {
    const title = isStepCompleted
      ? COMPLETED_STEP_TITLE[usageReason]
      : t`What will you use Dashboard for?`;
    return (
      <InactiveStep
        title={title}
        label={stepLabel}
        isStepCompleted={isStepCompleted}
      />
    );
  }

  return (
    <ActiveStep title={t`What will you use Dashboard for?`} label={stepLabel}>
      <Radio.Group
        name="usage-reason"
        defaultValue="self-service-analytics"
        value={usageReason}
        onChange={handleChange}
      >
        <Stack pt="lg">
          <Radio
            value="self-service-analytics"
            label={t`Self-service analytics for my own company`}
          />
          <Radio
            hidden
            value="embedding"
            label={t`Embedding analytics into my application`}
          />
          <Radio hidden value="both" label={t`A bit of both`} />
          <Radio hidden value="not-sure" label={t`Not sure yet`} />
        </Stack>
      </Radio.Group>
      <Divider my="xl" />
      <Button variant="filled" onClick={handleSubmit}>
        {t`Next`}
      </Button>
    </ActiveStep>
  );
};
