import cx from "classnames";
import { t } from "ttag";

import ButtonsS from "metabase/css/components/buttons.module.css";
import { useSelector } from "metabase/redux";
import { Switch, Title } from "metabase/ui";

import { getIsStepActive } from "../../selectors";

import { StepBody, StepFooter, StepRoot } from "./CompletedStep.styled";

export const CompletedStep = (): JSX.Element | null => {
  const isStepActive = useSelector((state) =>
    getIsStepActive(state, "completed"),
  );
  if (!isStepActive) {
    return null;
  }

  const baseUrl = window.MetabaseRoot ?? "/";

  return (
    <StepRoot>
      <Title order={2}>{t`You're all set up!`}</Title>
      <StepBody>
        <Switch
          checked={false}
          disabled
          label={t`Get infrequent emails about new releases and feature updates.`}
        />
      </StepBody>
      <StepFooter>
        <a
          className={cx(
            ButtonsS.Button,
            ButtonsS.ButtonPrimary,
            ButtonsS.ButtonLarge,
          )}
          href={baseUrl}
        >
          进入数据看板
        </a>
      </StepFooter>
    </StepRoot>
  );
};
