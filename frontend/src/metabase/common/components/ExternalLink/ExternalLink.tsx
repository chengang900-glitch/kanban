import type { AnchorHTMLAttributes, ReactNode, Ref } from "react";
import { Children, forwardRef, isValidElement } from "react";

import CS from "metabase/css/core/index.css";
import { getUrlTarget } from "metabase/urls";

import S from "./ExternalLink.module.css";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  target?: string;
  className?: string;
  children?: ReactNode;
}

// Keep the customized UI free of promotional/help links labelled "Learn more".
// Read nested labels too (e.g. Text plus a share icon), without filtering URLs.
function getLabelText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }
      return isValidElement<{ children?: ReactNode }>(child)
        ? getLabelText(child.props.children)
        : "";
    })
    .join("");
}

export const ExternalLink = forwardRef(function ExternalLink(
  { href, target = getUrlTarget(href), className, children, ...props }: Props,
  ref: Ref<HTMLAnchorElement>,
) {
  const label =
    getLabelText(children).trim() || props["aria-label"] || props.title || "";
  if (
    /^learn\s+more\b/i.test(label) ||
    /^了解(?:更多|.*更多信息)/.test(label)
  ) {
    return null;
  }

  return (
    <a
      ref={ref}
      role="link"
      href={href}
      className={`${S.LinkRoot} ${className || CS.link}`}
      target={target}
      // prevent malicious pages from navigating us away
      rel="noopener noreferrer"
      // disables quickfilter in tables
      onClickCapture={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </a>
  );
});

export const ButtonLink = forwardRef(function ButtonLink(
  props: Props,
  ref: Ref<HTMLAnchorElement>,
) {
  return <ExternalLink {...props} className={S.ButtonLink} ref={ref} />;
});
