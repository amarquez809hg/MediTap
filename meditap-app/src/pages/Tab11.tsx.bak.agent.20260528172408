import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonToggle,
  IonNote,
  IonAlert,
} from '@ionic/react';
import {
  notificationsOutline,
  shieldOutline,
  moonOutline,
  informationCircleOutline,
  logOutOutline,
  languageOutline,
  fingerPrintOutline,
} from 'ionicons/icons';
import './Tab11.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../config/api';
import { useDarkMode } from '../contexts/DarkModeContext';

function fullAppUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${seg}`;
}

const LS_PUSH = 'meditap_settings_push_notifications';
const APP_VERSION = '0.0.1';

const Tab11: React.FC = () => {
  const { logout, isStaff, isSuperuser } = useAuth();
  const djangoAdminUrl = `${getApiBase().replace(/\/$/, '')}/admin/`;
  const { dark: darkModeEnabled, setDark: setDarkMode } = useDarkMode();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  useEffect(() => {
    try {
      const n = localStorage.getItem(LS_PUSH);
      if (n === '0') setNotificationsEnabled(false);
    } catch {
      /* ignore */
    }
  }, []);

  const persistNotifications = useCallback((on: boolean) => {
    setNotificationsEnabled(on);
    try {
      localStorage.setItem(LS_PUSH, on ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (on && typeof window !== 'undefined' && 'Notification' in window) {
      void Notification.requestPermission();
    }
  }, []);

  const handleLogout = () => {
    void logout();
  };

  return (
    <IonPage className="ct-page ct-tab11">
      <IonContent fullscreen className="settings-page-content">
        <div className="settings-container">
          <header className="settings-header">
            <h1>
              <i className="fas fa-cog" aria-hidden />
              Settings
            </h1>
            <div className="settings-header__actions">
              <a
                href={fullAppUrl('/tab1')}
                className="book-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-arrow-left" aria-hidden />
                Go back to dashboard
              </a>
            </div>
          </header>

          <main className="settings-main">
            <div className="settings-list">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">General Preferences</span>
              </div>
              <IonList lines="none" className="settings-list-ion">
          <IonItem className="settings-item">
            <IonIcon icon={notificationsOutline} slot="start" />
            <IonLabel>Push Notifications</IonLabel>
            <IonToggle
              checked={notificationsEnabled}
              onIonChange={(e) => persistNotifications(e.detail.checked)}
              slot="end"
            />
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={languageOutline} slot="start" />
            <IonLabel>Language</IonLabel>
            <IonNote slot="end">English</IonNote>
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={moonOutline} slot="start" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle
              checked={darkModeEnabled}
              onIonChange={(e) => setDarkMode(e.detail.checked)}
              slot="end"
            />
          </IonItem>
              </IonList>
            </div>

            {(isSuperuser || isStaff) && (
              <div className="settings-list settings-list--spaced">
                <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                  <span className="settings-glass-subtitle__label">Administration</span>
                </div>
                <IonList lines="none" className="settings-list-ion">
                  <IonItem
                    button
                    detail
                    className="settings-item"
                    onClick={() =>
                      window.open(djangoAdminUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    <IonIcon icon={shieldOutline} slot="start" />
                    <IonLabel>Django Admin</IonLabel>
                    <IonNote slot="end">Separate sign-in on API host</IonNote>
                  </IonItem>
                  {isSuperuser && (
                    <IonItem className="settings-item">
                      <IonIcon icon={informationCircleOutline} slot="start" />
                      <IonLabel>Superuser</IonLabel>
                      <IonNote slot="end">Full API + admin access</IonNote>
                    </IonItem>
                  )}
                </IonList>
              </div>
            )}

            <div className="settings-list settings-list--spaced">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">Security & Privacy</span>
              </div>
              <IonList lines="none" className="settings-list-ion">
          <IonItem className="settings-item">
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Password</IonLabel>
            <IonNote slot="end">Ask an administrator to reset your Django user password</IonNote>
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={fingerPrintOutline} slot="start" />
            <IonLabel>Enable Biometric Lock</IonLabel>
            <IonNote slot="end">Not available in this web app</IonNote>
          </IonItem>
              </IonList>
            </div>

            <div className="settings-list settings-list--spaced">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">App Information</span>
              </div>
              <IonList lines="none" className="settings-list-ion">
          <IonItem button detail className="settings-item">
            <IonIcon icon={informationCircleOutline} slot="start" />
            <IonLabel>Version</IonLabel>
            <IonNote slot="end">{APP_VERSION}</IonNote>
          </IonItem>

          <IonItem button detail className="settings-item" routerLink="/about">
            <IonIcon icon={informationCircleOutline} slot="start" />
            <IonLabel>About MediTap</IonLabel>
          </IonItem>

          <IonItem button detail className="settings-item">
            <IonIcon icon={shieldOutline} slot="start" />
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
              </IonList>
            </div>

            <Link
              to="/tab3"
              className="settings-footer-btn settings-footer-btn--report"
            >
              <IonIcon icon={shieldOutline} aria-hidden />
              Report card as lost
            </Link>

            <button
              type="button"
              className="settings-footer-btn settings-footer-btn--logout"
              onClick={() => setShowLogoutAlert(true)}
            >
              <IonIcon icon={logOutOutline} aria-hidden />
              Log out
            </button>
          </main>
        </div>
      </IonContent>

      <IonAlert
        isOpen={showLogoutAlert}
        onDidDismiss={() => setShowLogoutAlert(false)}
        header="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
          },
          {
            text: 'Logout',
            handler: handleLogout,
          },
        ]}
      />
    </IonPage>
  );
};

export default Tab11;
