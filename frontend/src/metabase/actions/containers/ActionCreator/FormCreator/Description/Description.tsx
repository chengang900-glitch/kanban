import { jt } from "ttag";

import { InfoText } from "./Description.styled";

export function Description() {
  return (
    <InfoText>
      {jt`Configure your parameters' types and properties here. The values for these parameters can come from user input, or from a dashboard filter.`}
    </InfoText>
  );
}
