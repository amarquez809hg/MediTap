import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  bindPatientCardUid,
  issuePatientCard,
  listPatientCards,
  revokePatientCard,
  type PatientCardRow,
} from './patientCardApi';
import './PatientCardBindPanel.css';

type PatientCardBindPanelProps = {
  patientId: string;
};

const PatientCardBindPanel: React.FC<PatientCardBindPanelProps> = ({ patientId }) => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<PatientCardRow[]>([]);
  const [freshUrl, setFreshUrl] = useState('');
  const [uidByCard, setUidByCard] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const rows = await listPatientCards(patientId);
    setCards(rows);
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    void load().catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : t('cardBind.loadError'));
    });
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const onIssue = async () => {
    setBusy(true);
    setError('');
    setCopied(false);
    try {
      const created = await issuePatientCard(patientId);
      setFreshUrl(created.url || '');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cardBind.issueError'));
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!freshUrl) return;
    await navigator.clipboard.writeText(freshUrl);
    setCopied(true);
  };

  const onBind = async (cardId: string) => {
    setBusy(true);
    setError('');
    try {
      await bindPatientCardUid(cardId, uidByCard[cardId] || '');
      setUidByCard((prev) => ({ ...prev, [cardId]: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cardBind.bindError'));
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async (cardId: string) => {
    setBusy(true);
    setError('');
    try {
      await revokePatientCard(cardId);
      if (freshUrl) setFreshUrl('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cardBind.revokeError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-bind" aria-label={t('cardBind.title')}>
      <div className="card-bind__head">
        <h2>{t('cardBind.title')}</h2>
        <button type="button" onClick={() => void onIssue()} disabled={busy}>
          {t('cardBind.create')}
        </button>
      </div>
      <p className="card-bind__hint">{t('cardBind.hint')}</p>
      {error ? <p className="card-bind__error">{error}</p> : null}
      {freshUrl ? (
        <div className="card-bind__url">
          <label htmlFor="card-bind-url">{t('cardBind.linkOnce')}</label>
          <div className="card-bind__url-row">
            <input id="card-bind-url" readOnly value={freshUrl} />
            <button type="button" onClick={() => void onCopy()}>
              {copied ? t('cardBind.copied') : t('cardBind.copy')}
            </button>
          </div>
        </div>
      ) : null}
      {cards.length === 0 ? <p className="card-bind__hint">{t('cardBind.empty')}</p> : null}
      <ul className="card-bind__list">
        {cards.map((card) => (
          <li key={card.card_id}>
            <div className="card-bind__meta">
              <strong>{card.card_uid || t('cardBind.notBound')}</strong>
              <span>{card.revoked_at ? t('cardBind.revoked') : t('cardBind.active')}</span>
            </div>
            {!card.revoked_at && !card.card_uid ? (
              <div className="card-bind__url-row">
                <input
                  aria-label={t('cardBind.uidLabel')}
                  placeholder={t('cardBind.uidPlaceholder')}
                  value={uidByCard[card.card_id] || ''}
                  onChange={(event) =>
                    setUidByCard((prev) => ({ ...prev, [card.card_id]: event.target.value }))
                  }
                />
                <button type="button" disabled={busy} onClick={() => void onBind(card.card_id)}>
                  {t('cardBind.bind')}
                </button>
              </div>
            ) : null}
            {!card.revoked_at ? (
              <button type="button" className="card-bind__revoke" disabled={busy} onClick={() => void onRevoke(card.card_id)}>
                {t('cardBind.revoke')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default PatientCardBindPanel;
