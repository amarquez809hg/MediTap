import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePortalHistory } from '../navigation/PortalHistoryContext';

type GoBackButtonProps = {
  /** Route used when there is no previous in-app page. */
  fallback: string;
  className?: string;
  /** Optional label override; defaults to i18n `common.goBackToPrevious`. */
  label?: string;
  /** Render as a text-style control (tab headers) vs shell nav button. */
  variant?: 'header' | 'shell' | 'plain';
  /** Runs before navigation (e.g. clear staff elevation). */
  onBeforeNavigate?: () => void;
};

/**
 * Returns to the previous accessed page within the portal via hard navigation.
 * Falls back to `fallback` when history is empty. See docs/PORTAL_GO_BACK_MATRIX.md.
 */
const GoBackButton: React.FC<GoBackButtonProps> = ({
  fallback,
  className = '',
  label,
  variant = 'header',
  onBeforeNavigate,
}) => {
  const { t } = useTranslation();
  const { goBack } = usePortalHistory();
  const text = label ?? t('common.goBackToPrevious');

  const base =
    variant === 'shell'
      ? 'portal-shell__back'
      : variant === 'header'
        ? 'book-btn'
        : '';

  return (
    <button
      type="button"
      className={`${base} ${className}`.trim()}
      onClick={() => {
        onBeforeNavigate?.();
        goBack(fallback);
      }}
      aria-label={text}
    >
      <i className="fas fa-arrow-left" aria-hidden />
      <span>{text}</span>
    </button>
  );
};

export default GoBackButton;
