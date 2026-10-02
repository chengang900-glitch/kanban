// eslint-disable-next-line no-restricted-imports
import { css } from "@emotion/react";
// eslint-disable-next-line no-restricted-imports
import styled from "@emotion/styled";

import { Link } from "metabase/common/components/Link";
import { doNotForwardProps } from "metabase/common/utils/doNotForwardProps";

export const LogoLink = styled(
  Link,
  doNotForwardProps("isSmallAppBar", "isGitSyncVisible"),
)<{
  isSmallAppBar: boolean;
  isGitSyncVisible: boolean;
}>`
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  height: 3.25rem;
  padding-inline: 0.5rem;
  min-width: 2.25rem;
  max-width: ${(props) => (props.isSmallAppBar ? "8rem" : "14rem")};
  line-height: normal;
  opacity: 1;
  ${(props) =>
    !props.isSmallAppBar &&
    css`
      margin-inline-end: ${props.isGitSyncVisible ? "1rem" : "2rem"};
    `}
`;
