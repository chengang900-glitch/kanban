import { t } from "ttag";

import type Question from "metabase-lib/v1/Question";
import {
  isDateParameter,
  isNumberParameter,
  isStringParameter,
} from "metabase-lib/v1/parameters/utils/parameter-type";
import type { Parameter } from "metabase-types/api";

import {
  NativeCardDefault,
  NativeCardIcon,
  NativeCardText,
} from "./DisabledNativeCardHelpTextComponents";

interface DisabledNativeCardHelpTextProps {
  question: Question;
  parameter: Parameter;
}

export function DisabledNativeCardHelpText({
  question,
  parameter,
}: DisabledNativeCardHelpTextProps) {
  if (question.type() === "model") {
    return <ModelHelpText />;
  } else {
    return <ParameterHelpText parameter={parameter} />;
  }
}

function ModelHelpText() {
  return (
    <NativeCardDefault>
      <NativeCardIcon name="info" />
      <NativeCardText>
        {t`Models are data sources and thus can’t have parameters mapped.`}
      </NativeCardText>
    </NativeCardDefault>
  );
}

interface ParameterHelpTextProps {
  parameter: Parameter;
}

function ParameterHelpText({ parameter }: ParameterHelpTextProps) {
  return (
    <NativeCardDefault>
      <NativeCardIcon name="info" />
      <NativeCardText>{getParameterHelpText(parameter)}</NativeCardText>
    </NativeCardDefault>
  );
}

export function getParameterHelpText(parameter: Parameter) {
  if (isDateParameter(parameter)) {
    return t`A date variable in this card can only be connected to a time type with the single date option.`;
  }

  if (isNumberParameter(parameter)) {
    return t`A number variable in this card can only be connected to a number filter with Equal to operator.`;
  }

  if (isStringParameter(parameter)) {
    return t`A text variable in this card can only be connected to a text filter with Is operator.`;
  }

  return t`Add a variable to this question to connect it to a dashboard filter.`;
}
