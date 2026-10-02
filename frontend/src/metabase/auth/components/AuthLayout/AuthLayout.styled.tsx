// eslint-disable-next-line no-restricted-imports
import styled from "@emotion/styled";

import LoginFluentBackground from "assets/img/login-fluent-background.png";
import { breakpointMinSmall } from "metabase/styled-components/theme";
import { color } from "metabase/ui/colors";

export const LayoutRoot = styled.div`
  position: relative;
  min-height: 100vh;
  background-color: ${color("background_page-secondary")};
  background-image: url("${LoginFluentBackground}");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
`;

export const LayoutBody = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 1.5rem 1rem 3rem;
  min-height: 100vh;
`;

export const LayoutCard = styled.div`
  width: 100%;
  margin-top: 1.5rem;
  padding: 2.5rem 1.5rem;
  background-color: ${color("background_page-primary")};
  border: 1px solid ${color("border-neutral-subtle")};
  box-shadow:
    0 24px 60px color-mix(in srgb, ${color("text-primary")} 10%, transparent),
    inset 0 1px 0 ${color("core-white")};
  border-radius: 1.25rem;

  input:not([type="checkbox"]) {
    background-color: ${color("background_page-secondary")};
    border-color: ${color("border-neutral-subtle")};
    border-radius: 0.625rem;
  }

  ${breakpointMinSmall} {
    width: 30.875rem;
    padding: 2.5rem 3.5rem;
  }
`;
