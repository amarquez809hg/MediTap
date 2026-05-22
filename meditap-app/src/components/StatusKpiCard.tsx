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
  highlightClass: string;
  onNavigate: (href: string) => void;
  loading?: boolean;
  ariaLabel?: string;
};

const StatusKpiCard: React.FC<StatusKpiCardProps> = ({
  title,
  value,
  subtitle,
  href,
  highlightClass,
  onNavigate,
  loading = false,
  ariaLabel,
}) => (
  <IonCard
    button
    className={`status-card status-card--clickable ${highlightClass}`}
    onClick={() => onNavigate(href)}
    aria-label={ariaLabel ?? `${title}: ${subtitle}. Open tab.`}
  >
    <IonCardHeader>
      <IonCardTitle>{title}</IonCardTitle>
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
