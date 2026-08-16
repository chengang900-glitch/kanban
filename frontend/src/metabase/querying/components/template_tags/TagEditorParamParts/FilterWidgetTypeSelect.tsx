import { useMemo } from "react";
import { t } from "ttag";

import { Select } from "metabase/ui";
import type { TemplateTag } from "metabase-types/api";

import type { WidgetOption } from "../types";

import { ContainerLabel, ErrorSpan, InputContainer } from "./TagEditorParam";

export function FilterWidgetTypeSelect({
  tag,
  value,
  onChange,
  options,
}: {
  tag: TemplateTag;
  value: string;
  onChange: (widgetType: string) => void;
  options: WidgetOption[];
}) {
  const hasOptions = options.length > 0;
  const hasNoWidgetType = tag["widget-type"] === "none" || !tag["widget-type"];

  const optionsOrDefault = useMemo(
    () =>
      (hasOptions ? options : [{ name: t`None`, type: "none" }]).map(
        (option) => ({
          label: option.menuName ?? option.name ?? option.type,
          value: option.type,
        }),
      ),
    [hasOptions, options],
  );

  return (
    <InputContainer>
      <ContainerLabel>
        {t`Filter widget type`}
        {/* TODO this might be incorrect, because we allow running the query (see sql-field-filter e2e test)
            but show "required" here despite it's None */}
        {hasNoWidgetType && <ErrorSpan ml="xs">({t`required`})</ErrorSpan>}
      </ContainerLabel>

      <Select
        value={value}
        onChange={onChange}
        placeholder={t`Select…`}
        data={optionsOrDefault}
        data-testid="filter-widget-type-select"
        disabled={optionsOrDefault.length === 1}
      />

      {!hasOptions && (
        <p>{t`There aren't any filter widgets for this type of field yet.`}</p>
      )}
    </InputContainer>
  );
}
