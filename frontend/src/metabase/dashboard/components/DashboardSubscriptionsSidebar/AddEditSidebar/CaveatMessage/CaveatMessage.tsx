import { t } from "ttag";

import { Text } from "metabase/ui";

import S from "./CaveatMessage.module.css";

export function CaveatMessage() {
  return (
    <Text className={S.root}>
      {t`Recipients will see this data just as you see it, regardless of their permissions.`}
    </Text>
  );
}
