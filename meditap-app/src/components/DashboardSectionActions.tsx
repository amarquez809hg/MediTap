import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardSectionActions.css';

type DashboardSectionActionsProps = {
  viewHref: string;
  viewLabel: string;
  addLabel: string;
  onAddEntry: () => void;
};

const DashboardSectionActions: React.FC<DashboardSectionActionsProps> = ({
  viewHref,
  viewLabel,
  addLabel,
  onAddEntry,
}) => (
  <div className="dashboard-tab-section__actions dashboard-section-actions">
    <Link to={viewHref} className="book-btn dashboard-tab-section__btn dashboard-section-actions__view">
      <i className="fas fa-external-link-alt" aria-hidden /> {viewLabel}
    </Link>
    <button
      type="button"
      className="book-btn dashboard-tab-section__btn dashboard-section-actions__add"
      onClick={onAddEntry}
    >
      <i className="fas fa-plus" aria-hidden /> {addLabel}
    </button>
  </div>
);

export default DashboardSectionActions;
