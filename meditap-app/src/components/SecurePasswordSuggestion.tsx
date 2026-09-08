import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  assessPasswordStrength,
  generateSecurePassword,
  type PasswordStrengthLevel,
} from '../auth/securePassword';

type Props = {
  password: string;
  disabled?: boolean;
  /** Called with a freshly generated password (caller should fill confirm too). */
  onSuggest: (password: string) => void;
  className?: string;
  /** Optional status line after a suggestion (e.g. “Password filled — save it somewhere safe”). */
  suggestionHint?: string | null;
};

const LEVEL_CLASS: Record<PasswordStrengthLevel, string> = {
  empty: 'password-security__meter-fill--empty',
  weak: 'password-security__meter-fill--weak',
  fair: 'password-security__meter-fill--fair',
  good: 'password-security__meter-fill--good',
  strong: 'password-security__meter-fill--strong',
};

/**
 * Suggest-secure-password control + live strength meter for register / reset forms.
 */
export default function SecurePasswordSuggestion({
  password,
  disabled,
  onSuggest,
  className,
  suggestionHint,
}: Props) {
  const { t } = useTranslation();
  const strength = useMemo(() => assessPasswordStrength(password), [password]);

  const handleSuggest = () => {
    const next = generateSecurePassword();
    onSuggest(next);
  };

  return (
    <div className={`password-security${className ? ` ${className}` : ''}`}>
      <div className="password-security__actions">
        <button
          type="button"
          className="password-security__suggest-btn"
          onClick={handleSuggest}
          disabled={disabled}
        >
          {t('passwordSecurity.suggest')}
        </button>
        <span className="password-security__hint">{t('passwordSecurity.suggestHint')}</span>
      </div>

      <div
        className="password-security__meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={strength.score}
        aria-label={t('passwordSecurity.strengthLabel')}
      >
        <div
          className={`password-security__meter-fill ${LEVEL_CLASS[strength.level]}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      <p className="password-security__strength-text" aria-live="polite">
        {t(strength.labelKey)}
      </p>
      {suggestionHint ? (
        <p className="password-security__suggested-note" role="status">
          {suggestionHint}
        </p>
      ) : null}
    </div>
  );
}
