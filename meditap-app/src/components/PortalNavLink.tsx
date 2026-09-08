import React from 'react';
import { navigatePortal, resolvePortalHref } from '../navigation/portalGoBack';

type PortalNavLinkProps = {
  to: string;
  className?: string;
  children: React.ReactNode;
  /** Optional aria / title */
  'aria-label'?: string;
  'aria-current'?: React.AriaAttributes['aria-current'];
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * In-app link that hard-navigates so Ionic IonRouterOutlet does not leave
 * sibling /app/* pages stacked/stuck. Use instead of react-router <Link>
 * for patient portal tab switches.
 */
const PortalNavLink: React.FC<PortalNavLinkProps> = ({
  to,
  className,
  children,
  onClick,
  ...rest
}) => {
  const resolved = resolvePortalHref(to);
  return (
    <a
      href={resolved}
      className={className}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        // Allow modified clicks (new tab) to use native behavior.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        navigatePortal(to);
      }}
    >
      {children}
    </a>
  );
};

export default PortalNavLink;
