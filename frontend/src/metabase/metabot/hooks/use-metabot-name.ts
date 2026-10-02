import { useSetting } from "metabase/common/hooks";

/** Returns the user-configured display name for Metabot (defaults to "AI机器人"). */
export const useMetabotName = (): string => {
  return useSetting("metabot-name") || "AI机器人";
};
