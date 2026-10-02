import { t } from "ttag";

import { ExplainerTextContainer } from "./ExplainerText.styled";

export function ExplainerText() {
  return (
    <ExplainerTextContainer>
      {t`You can either ask users to enter values, or use the value of a dashboard filter.`}
    </ExplainerTextContainer>
  );
}
