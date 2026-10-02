import { t } from "ttag";

import type { UserInfo } from "metabase-types/api";

export const getUserLabel = (user: UserInfo | null | undefined): string =>
  (user && getFullName(user)) || user?.common_name || user?.email || t`Unknown`;

export function getFullName(user: NamedUser): string | null {
  const firstName = user.first_name?.trim() || "";
  const lastName = user.last_name?.trim() || "";
  return `${lastName}${firstName}` || null;
}

export const getUserName = (userInfo?: NamedUser): string => {
  if (!userInfo) {
    return "";
  }
  const name = getFullName(userInfo);
  return name || userInfo.email || "";
};

export interface NamedUser {
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
}
