import React from 'react';
import PortalNavLink from './PortalNavLink';
import './DashboardRecordCard.css';

export type DashboardRecordField = {
  label: string;
  value: string;
};

type DashboardRecordCardProps = {
  title: string;
  badge?: string;
  fields: DashboardRecordField[];
  href?: string;
  actionLabel?: string;
};

const DashboardRecordCard: React.FC<DashboardRecordCardProps> = ({
  title,
  badge,
  fields,
  href,
  actionLabel,
}) => (
  <article className="dash-record" role="listitem">
    <header className="dash-record__head">
      <h3>{title || '—'}</h3>
      {badge ? <span className="dash-record__badge">{badge}</span> : null}
    </header>
    <dl className="dash-record__fields">
      {fields.map((field) => (
        <div key={field.label} className="dash-record__row">
          <dt>{field.label.replace(/[:：]\s*$/, '')}</dt>
          <dd>{field.value || '—'}</dd>
        </div>
      ))}
    </dl>
    {href && actionLabel ? (
      <PortalNavLink to={href} className="dash-record__action">
        {actionLabel}
      </PortalNavLink>
    ) : null}
  </article>
);

export default DashboardRecordCard;
