import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchPortalMessageUnreadSummary } from '../api';
import { navigatePortal } from '../navigation/portalGoBack';
import './PatientChatFab.css';

function ChatBubbleIcon() {
  return (
    <svg
      className="patient-chat-fab__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M4.5 4.75A2.75 2.75 0 0 1 7.25 2h9.5A2.75 2.75 0 0 1 19.5 4.75v8.5A2.75 2.75 0 0 1 16.75 16H11.1l-3.72 3.1a.9.9 0 0 1-1.48-.69V16H7.25A2.75 2.75 0 0 1 4.5 13.25v-8.5Z"
        opacity="0.95"
      />
      <path
        fill="currentColor"
        d="M8.25 7.1h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5Zm0 3.15h5.25a.75.75 0 0 1 0 1.5H8.25a.75.75 0 0 1 0-1.5Z"
        opacity="0.55"
      />
    </svg>
  );
}

/**
 * Fixed glassy chat control — bottom-right shortcut to clinic messaging.
 * Uses inline SVG so the icon always shows (no Font Awesome dependency).
 */
const PatientChatFab: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const onMessages = location.pathname.startsWith('/app/messages');

  const refreshUnread = useCallback(async () => {
    try {
      const summary = await fetchPortalMessageUnreadSummary();
      if (summary.role === 'patient') {
        setUnread(summary.unread_count || 0);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (onMessages) return;
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), 30000);
    return () => window.clearInterval(id);
  }, [onMessages, refreshUnread, location.pathname]);

  if (onMessages) return null;

  const label = t('portal.chatFabLabel');
  const title =
    unread > 0
      ? t('portal.chatFabUnread', { count: unread })
      : label;

  return (
    <button
      type="button"
      className="patient-chat-fab"
      aria-label={title}
      title={title}
      onClick={() => navigatePortal('/app/messages')}
    >
      <span className="patient-chat-fab__glow" aria-hidden />
      <span className="patient-chat-fab__icon-wrap" aria-hidden>
        <ChatBubbleIcon />
      </span>
      <span className="patient-chat-fab__copy">
        <span className="patient-chat-fab__kicker">Clinic</span>
        <span className="patient-chat-fab__text">{t('portal.chatFabShort')}</span>
      </span>
      {unread > 0 ? (
        <span className="patient-chat-fab__badge">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </button>
  );
};

export default PatientChatFab;
