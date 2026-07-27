import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { completeEpicOAuth, formatSessionOrTokenErrorForUi } from '../api';
import './Tab13.css';

const ADMIN_PANEL_PATH = '/admin-portal/panel';

/**
 * OAuth redirect target for Epic sandbox (must match EPIC_REDIRECT_URI on the backend).
 */
const EpicCallback: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code') || '';
    const state = params.get('state') || '';
    if (!code || !state) {
      setBusy(false);
      setError(t('epicCallback.missingParams'));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await completeEpicOAuth(code, state);
        if (!cancelled) {
          setMessage(t('epicCallback.linked'));
          setBusy(false);
          window.setTimeout(() => history.replace(ADMIN_PANEL_PATH), 900);
        }
      } catch (e) {
        if (!cancelled) {
          const m = e instanceof Error ? e.message : t('epicCallback.completeError');
          setError(formatSessionOrTokenErrorForUi(m));
          setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [history, location.search, t]);

  return (
    <IonPage className="ct-page ct-tab13">
      <IonContent className="ion-padding">
        <div className="tab13-epic-callback">
          {busy && !error && (
            <div className="tab13-epic-callback__status">
              <IonSpinner name="crescent" />
              <p>{t('epicCallback.completing')}</p>
            </div>
          )}
          {message && <p className="tab13-epic-callback__ok">{message}</p>}
          {error && <p className="tab13-epic-callback__err">{error}</p>}
          {!busy && (
            <button
              type="button"
              className="tab13-epic-callback__back"
              onClick={() => history.replace(ADMIN_PANEL_PATH)}
            >
              {t('epicCallback.backToAdmin')}
            </button>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default EpicCallback;
