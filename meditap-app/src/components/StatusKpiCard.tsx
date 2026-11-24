import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonSpinner,
} from '@ionic/react';

export type StatusKpiCardProps = {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  href: string;
  onNavigate: (href: string) => void;
  loading?: boolean;
  ariaLabel?: string;
  /** Optional clinical chip, e.g. New / Severe / Due */
  badge?: string;
  /** Softer emphasis for action-queue metrics */
  queue?: boolean;
  /** @deprecated rainbow highlights removed; kept for call-site compatibility */
  highlightClass?: string;
};

const StatusKpiCard: React.FC<StatusKpiCardProps> = ({
  title,
  value,
  subtitle,
  href,
  onNavigate,
  loading = false,
  ariaLabel,
  badge,
  queue = false,
}) => (
  <IonCard
    button
    className={`status-card status-card--clinical status-card--clickable${
      queue ? ' status-card--queue' : ''
    }`}
    onClick={() => onNavigate(href)}
    aria-label={ariaLabel ?? `${title}: ${subtitle}. Open tab.`}
  >
    <IonCardHeader>
      <div className="status-card__title-row">
        <IonCardTitle>{title}</IonCardTitle>
        {badge ? <span className="status-card__badge">{badge}</span> : null}
      </div>
    </IonCardHeader>
    <IonCardContent>
      {loading ? (
        <IonSpinner name="crescent" />
      ) : (
        <>
          <div className="status-value">{value}</div>
          <IonCardSubtitle>{subtitle}</IonCardSubtitle>
        </>
      )}
    </IonCardContent>
  </IonCard>
);

export default StatusKpiCard;
