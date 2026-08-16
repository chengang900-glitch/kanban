import { useEffect } from "react";
import { useTimeout } from "react-use";

import { useDispatch, useSelector } from "metabase/redux";
import { Button } from "metabase/ui";

import { goToNextStep, loadDefaults } from "../../actions";
import { LOCALE_TIMEOUT } from "../../constants";
import { getIsLocaleLoaded } from "../../selectors";

import { PageMain, PageRoot, PageTitle } from "./WelcomePage.styled";

export const WelcomePage = (): JSX.Element | null => {
  const [isElapsed] = useTimeout(LOCALE_TIMEOUT);
  const isLocaleLoaded = useSelector(getIsLocaleLoaded);
  const dispatch = useDispatch();

  const handleStepSubmit = () => {
    dispatch(goToNextStep());
  };

  useEffect(() => {
    dispatch(loadDefaults());
  }, [dispatch]);

  if (!isElapsed() && !isLocaleLoaded) {
    return null;
  }

  return (
    <PageRoot data-testid="welcome-page">
      <PageMain>
        <PageTitle>欢迎使用数据看板</PageTitle>
        <Button variant="filled" mt="xl" autoFocus onClick={handleStepSubmit}>
          开始使用
        </Button>
      </PageMain>
    </PageRoot>
  );
};
