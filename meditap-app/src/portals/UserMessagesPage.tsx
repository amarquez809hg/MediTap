import React, { useCallback, useEffect, useRef, useState } from 'react';
import GoBackButton from '../components/GoBackButton';
import {
  createPortalMessage,
  ensurePatientForCurrentSession,
  listPortalMessages,
  markPortalThreadRead,
  type PortalMessageApi,
} from '../api';
import { useAuth } from '../contexts/AuthContext';
import { chartPageGoBackFallback } from '../navigation/portalGoBack';
import { PATIENT_MESSAGE_PROPOSALS } from './patientMessageProposals';
import './userMessages.css';

function MessageGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M4.5 4.75A2.75 2.75 0 0 1 7.25 2h9.5A2.75 2.75 0 0 1 19.5 4.75v8.5A2.75 2.75 0 0 1 16.75 16H11.1l-3.72 3.1a.9.9 0 0 1-1.48-.69V16H7.25A2.75 2.75 0 0 1 4.5 13.25v-8.5Z"
      />
    </svg>
  );
}

/**
 * Patient portal clinic messaging — corporate glass workspace.
 */
const UserMessagesPage: React.FC = () => {
  const { username, portalHome, isStaff, isSuperuser } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PortalMessageApi[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (portalHome === 'admin' || (isStaff && !username)) {
        throw new Error(
          'Clinic messages need a patient sign-in. Open the patient portal login and sign in as the patient (staff session stays separate).'
        );
      }
      const patient = await ensurePatientForCurrentSession(username);
      if (!patient?.patient_id) {
        throw new Error(
          'No patient chart is linked to this account. Complete intake or sign in with the patient username.'
        );
      }
      const pid = patient.patient_id;
      setPatientId(pid);
      const rows = await listPortalMessages({ patientId: pid });
      setMessages(rows);
      const unreadClinic = rows.some(
        (m) => m.direction === 'clinic_to_patient' && !m.read_at
      );
      if (unreadClinic) {
        await markPortalThreadRead(pid);
        setMessages((prev) =>
          prev.map((m) =>
            m.direction === 'clinic_to_patient' && !m.read_at
              ? { ...m, read_at: new Date().toISOString(), is_unread: false }
              : m
          )
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [username, portalHome, isStaff]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const applyProposal = (id: string, body: string) => {
    setSelectedProposalId(id);
    setDraft(body);
    setNotice(null);
    setError(null);
    requestAnimationFrame(() => {
      const el = draftRef.current;
      if (!el) return;
      el.focus();
      const end = body.length;
      el.setSelectionRange(end, end);
    });
  };

  const writeOwnMessage = () => {
    setSelectedProposalId(null);
    setDraft('');
    setNotice(null);
    requestAnimationFrame(() => draftRef.current?.focus());
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      if (portalHome === 'admin' || isSuperuser) {
        throw new Error(
          'Sending from a staff session posts as a clinic reply. Sign in as the patient on the patient portal first.'
        );
      }
      // Do not pass patientId — backend forces patient_to_clinic for non-staff.
      const created = await createPortalMessage({ body });
      if (created.direction !== 'patient_to_clinic') {
        throw new Error(
          'Message was not stored as a patient request. Sign out of staff here and sign in as the patient account.'
        );
      }
      setMessages((prev) => [...prev, created]);
      setDraft('');
      setSelectedProposalId(null);
      setPatientId(created.patient);
      setNotice('Delivered to the clinic care team. Staff will see a notification.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="user-messages">
      <div className="user-messages__shell">
        <header className="user-messages__hero meditap-glass-header">
          <div className="user-messages__hero-top">
            <GoBackButton fallback={chartPageGoBackFallback()} variant="shell" />
            <span className="user-messages__secure">Secure clinic channel</span>
          </div>
          <div className="user-messages__hero-main">
            <span className="user-messages__hero-icon" aria-hidden>
              <MessageGlyph />
            </span>
            <div>
              <p className="user-messages__eyebrow">Patient portal</p>
              <h1>Clinic messages</h1>
              <p>
                Write directly to your care team about appointments, documents,
                or your chart. Clinic staff are notified when you send.
              </p>
            </div>
          </div>
          <ul className="user-messages__meta" aria-label="Channel details">
            <li>
              <strong>Care team</strong>
              <span>Clinic operations</span>
            </li>
            <li>
              <strong>Response</strong>
              <span>During clinic hours</span>
            </li>
            <li>
              <strong>Privacy</strong>
              <span>Signed-in portal only</span>
            </li>
          </ul>
        </header>

        {error ? <p className="user-messages__error" role="alert">{error}</p> : null}
        {notice ? <p className="user-messages__notice" role="status">{notice}</p> : null}

        <section className="user-messages__workspace" aria-label="Conversation">
          <header className="user-messages__workspace-head">
            <div>
              <h2>Conversation</h2>
              <p>Messages stay on your MediTap chart for clinic follow-up.</p>
            </div>
            <button
              type="button"
              className="user-messages__refresh"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </button>
          </header>

          <div className="user-messages__thread" role="log" aria-live="polite">
            {loading ? (
              <p className="user-messages__muted">Loading conversation…</p>
            ) : messages.length === 0 ? (
              <div className="user-messages__empty">
                <span className="user-messages__empty-icon" aria-hidden>
                  <MessageGlyph />
                </span>
                <h3>Start a conversation with your clinic</h3>
                <p>
                  Pick a common request below, or write your own message. Your
                  note notifies staff in the admin portal.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.direction === 'patient_to_clinic';
                return (
                  <article
                    key={m.message_id}
                    className={`user-messages__bubble user-messages__bubble--${
                      mine ? 'mine' : 'clinic'
                    }`}
                  >
                    <header>
                      <strong>{mine ? 'You' : 'Clinic care team'}</strong>
                      <time dateTime={m.created_at}>
                        {new Date(m.created_at).toLocaleString()}
                      </time>
                    </header>
                    <p>{m.body}</p>
                  </article>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          <form
            className="user-messages__compose"
            onSubmit={(e) => void onSend(e)}
          >
            <div className="user-messages__proposals">
              <p className="user-messages__proposals-label" id="user-message-proposals">
                Quick requests
              </p>
              <div
                className="user-messages__proposal-list"
                role="group"
                aria-labelledby="user-message-proposals"
              >
                {PATIENT_MESSAGE_PROPOSALS.map((proposal) => {
                  const active = selectedProposalId === proposal.id;
                  return (
                    <button
                      key={proposal.id}
                      type="button"
                      className={`user-messages__proposal${
                        active ? ' user-messages__proposal--active' : ''
                      }`}
                      onClick={() => applyProposal(proposal.id, proposal.body)}
                      disabled={sending}
                      aria-pressed={active}
                    >
                      {proposal.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`user-messages__proposal user-messages__proposal--own${
                    selectedProposalId === null
                      ? ' user-messages__proposal--active'
                      : ''
                  }`}
                  onClick={writeOwnMessage}
                  disabled={sending}
                  aria-pressed={selectedProposalId === null}
                >
                  Write my own
                </button>
              </div>
            </div>

            <label htmlFor="user-message-draft">Message to clinic</label>
            <div className="user-messages__compose-row">
              <textarea
                id="user-message-draft"
                ref={draftRef}
                rows={3}
                maxLength={4000}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setSelectedProposalId(null);
                }}
                placeholder="Select a quick request above, or type your own message here…"
                disabled={sending}
              />
              <button type="submit" disabled={sending || !draft.trim()}>
                <MessageGlyph />
                <span>{sending ? 'Sending…' : 'Send'}</span>
              </button>
            </div>
            <p className="user-messages__compose-hint">
              Keep clinical details in this channel — do not use email for urgent
              symptoms. For emergencies call local emergency services.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
};

export default UserMessagesPage;
