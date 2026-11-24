import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GoBackButton from '../components/GoBackButton';
import {
  createPortalMessage,
  fetchPortalMessageUnreadSummary,
  listPortalMessages,
  markPortalThreadRead,
  type PortalMessageApi,
  type PortalMessageUnreadSummary,
} from '../api';
import { ADMIN_PORTAL_HOME } from './portalPaths';
import './adminOps.css';
import './adminMessages.css';

/**
 * Staff inbox for patient ↔ clinic portal messages — corporate workspace.
 */
const AdminMessagesPage: React.FC = () => {
  const location = useLocation();
  const initialPatient = useMemo(() => {
    const q = new URLSearchParams(location.search).get('patient');
    return q || null;
  }, [location.search]);

  const [summary, setSummary] = useState<PortalMessageUnreadSummary | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(initialPatient);
  const [messages, setMessages] = useState<PortalMessageApi[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const next = await fetchPortalMessageUnreadSummary();
      setSummary(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load inbox.');
      return null;
    }
  }, []);

  const loadThread = useCallback(
    async (patientId: string) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await listPortalMessages({ patientId });
        setMessages(rows);
        await markPortalThreadRead(patientId);
        await loadSummary();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load thread.');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [loadSummary]
  );

  useEffect(() => {
    void (async () => {
      const next = await loadSummary();
      if (!initialPatient && next?.threads[0]?.patient) {
        setSelectedPatient(next.threads[0].patient);
      }
    })();
  }, [loadSummary, initialPatient]);

  useEffect(() => {
    if (selectedPatient) void loadThread(selectedPatient);
  }, [selectedPatient, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const selectedLabel =
    messages[0]?.patient_label ||
    summary?.threads.find((t) => t.patient === selectedPatient)?.patient_label ||
    'Patient';

  const onReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const created = await createPortalMessage({
        body: draft.trim(),
        patientId: selectedPatient,
      });
      setMessages((prev) => [...prev, created]);
      setDraft('');
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reply.');
    } finally {
      setSending(false);
    }
  };

  const threadPatients = useMemo(() => {
    const map = new Map<string, { label: string; unread: number }>();
    for (const t of summary?.threads || []) {
      map.set(t.patient, { label: t.patient_label, unread: t.unread_count });
    }
    for (const m of messages) {
      if (!map.has(m.patient)) {
        map.set(m.patient, {
          label: m.patient_label || 'Patient',
          unread: 0,
        });
      }
    }
    if (selectedPatient && !map.has(selectedPatient)) {
      map.set(selectedPatient, { label: selectedLabel, unread: 0 });
    }
    return Array.from(map.entries());
  }, [summary, messages, selectedPatient, selectedLabel]);

  const unreadTotal = summary?.unread_count ?? 0;

  return (
    <div className="admin-ops admin-messages">
      <header className="admin-messages__hero">
        <div className="admin-messages__hero-top">
          <GoBackButton fallback={ADMIN_PORTAL_HOME} variant="plain" />
          <span className="admin-messages__secure">Staff secure channel</span>
        </div>
        <div className="admin-messages__hero-main">
          <span className="admin-messages__hero-icon" aria-hidden>
            <i className="fas fa-comments" />
          </span>
          <div>
            <p className="admin-messages__eyebrow">Admin / Patient care</p>
            <h1>Clinic messages</h1>
            <p>
              Review and reply to patient portal notes. Unread inbound messages
              also light the bell in the admin top bar.
            </p>
          </div>
        </div>
        <ul className="admin-messages__meta" aria-label="Inbox summary">
          <li>
            <strong>Unread</strong>
            <span>{unreadTotal}</span>
          </li>
          <li>
            <strong>Conversations</strong>
            <span>{threadPatients.length}</span>
          </li>
          <li>
            <strong>Source</strong>
            <span>Patient portal</span>
          </li>
        </ul>
        <div className="admin-messages__hero-actions">
          <button type="button" onClick={() => void loadSummary()}>
            <i className="fas fa-sync-alt" aria-hidden />
            Refresh inbox
          </button>
        </div>
      </header>

      {error ? <p className="admin-ops__error">{error}</p> : null}

      <div className="admin-messages__layout">
        <aside className="admin-messages__sidebar" aria-label="Conversations">
          <header className="admin-messages__sidebar-head">
            <h2>Inbox</h2>
            {unreadTotal > 0 ? (
              <span className="admin-messages__pill">{unreadTotal} unread</span>
            ) : (
              <span className="admin-messages__pill admin-messages__pill--muted">
                Caught up
              </span>
            )}
          </header>
          {threadPatients.length === 0 ? (
            <div className="admin-messages__empty-side">
              <i className="fas fa-inbox" aria-hidden />
              <p>No patient messages yet.</p>
              <span>When a patient sends from the user portal, the thread appears here.</span>
            </div>
          ) : (
            <ul>
              {threadPatients.map(([id, meta]) => (
                <li key={id}>
                  <button
                    type="button"
                    className={
                      id === selectedPatient
                        ? 'admin-messages__thread-btn admin-messages__thread-btn--active'
                        : 'admin-messages__thread-btn'
                    }
                    onClick={() => setSelectedPatient(id)}
                  >
                    <span className="admin-messages__avatar" aria-hidden>
                      {(meta.label || 'P').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="admin-messages__thread-copy">
                      <strong>{meta.label}</strong>
                      <em>Patient portal chat</em>
                    </span>
                    {meta.unread > 0 ? (
                      <span className="admin-messages__unread">{meta.unread}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="admin-messages__panel" aria-label="Thread">
          {!selectedPatient ? (
            <div className="admin-messages__empty-panel">
              <i className="fas fa-comments" aria-hidden />
              <h2>Select a conversation</h2>
              <p>
                Choose a patient on the left, or wait for a new note from the
                patient portal. The top-bar bell also jumps into unread threads.
              </p>
            </div>
          ) : (
            <>
              <header className="admin-messages__panel-head">
                <div>
                  <p className="admin-messages__panel-kicker">Conversation</p>
                  <h2>{selectedLabel}</h2>
                </div>
                <Link
                  className="admin-messages__hub-link"
                  to={`/admin-portal/patients/${selectedPatient}`}
                >
                  <i className="fas fa-user-injured" aria-hidden />
                  Open patient hub
                </Link>
              </header>
              {loading ? (
                <p className="admin-ops__docs-hint">Loading thread…</p>
              ) : messages.length === 0 ? (
                <div className="admin-messages__empty-panel admin-messages__empty-panel--compact">
                  <p>No messages in this thread yet.</p>
                </div>
              ) : (
                <div className="admin-messages__thread">
                  {messages.map((m) => {
                    const fromPatient = m.direction === 'patient_to_clinic';
                    return (
                      <article
                        key={m.message_id}
                        className={`admin-messages__bubble admin-messages__bubble--${
                          fromPatient ? 'patient' : 'clinic'
                        }`}
                      >
                        <header>
                          <strong>
                            {fromPatient
                              ? m.sender_username || 'Patient'
                              : m.sender_username || 'Clinic staff'}
                          </strong>
                          <time dateTime={m.created_at}>
                            {new Date(m.created_at).toLocaleString()}
                          </time>
                        </header>
                        <p>{m.body}</p>
                      </article>
                    );
                  })}
                  <div ref={threadEndRef} />
                </div>
              )}
              <form
                className="admin-messages__compose"
                onSubmit={(e) => void onReply(e)}
              >
                <label htmlFor="admin-message-draft">Reply to patient</label>
                <div className="admin-messages__compose-row">
                  <textarea
                    id="admin-message-draft"
                    rows={3}
                    maxLength={4000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Reply with scheduling guidance, document status, or chart follow-up…"
                    disabled={sending}
                  />
                  <button type="submit" disabled={sending || !draft.trim()}>
                    <i className="fas fa-paper-plane" aria-hidden />
                    <span>{sending ? 'Sending…' : 'Send reply'}</span>
                  </button>
                </div>
                <p className="admin-messages__compose-hint">
                  Replies appear in the patient Messages workspace. Keep clinical
                  advice appropriate for asynchronous portal chat.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminMessagesPage;
