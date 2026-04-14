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
import { clearMeditapIntakeElevation } from '../auth/staffElevationStorage';
import { getKeycloak, getKeycloakBaseUrl } from '../config/keycloak';

function fullAppUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${seg}`;
}

const LS_PUSH = 'meditap_settings_push_notifications';
const LS_DARK = 'meditap_settings_dark_mode';

const APP_VERSION = '0.0.1';

const Tab11: React.FC = () => {
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  useEffect(() => {
    try {
      const n = localStorage.getItem(LS_PUSH);
      if (n === '0') setNotificationsEnabled(false);
      const d = localStorage.getItem(LS_DARK);
      if (d === '1') setDarkModeEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('ion-palette-dark', darkModeEnabled);
    try {
      localStorage.setItem(LS_DARK, darkModeEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [darkModeEnabled]);

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
    clearMeditapIntakeElevation();
    void logout();
  };

  const openKeycloakAccountSecurity = () => {
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'meditap';
    const base = getKeycloakBaseUrl();
    const url = `${base}/realms/${encodeURIComponent(realm)}/account/#/security/signingin`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
            <IonIcon icon={notificationsOutline} slot="start" color="medium" />
            <IonLabel>Push Notifications</IonLabel>
            <IonToggle
              checked={notificationsEnabled}
              onIonChange={(e) => persistNotifications(e.detail.checked)}
              slot="end"
            />
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={languageOutline} slot="start" color="medium" />
            <IonLabel>Language</IonLabel>
            <IonNote slot="end">English</IonNote>
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={moonOutline} slot="start" color="medium" />
            <IonLabel>Dark Mode</IonLabel>
            <IonToggle
              checked={darkModeEnabled}
              onIonChange={(e) => setDarkModeEnabled(e.detail.checked)}
              slot="end"
            />
          </IonItem>
              </IonList>
            </div>

            <div className="settings-list settings-list--spaced">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">Security & Privacy</span>
              </div>
              <IonList lines="none" className="settings-list-ion">
          <IonItem
            button
            detail
            className="settings-item"
            onClick={() => {
              if (getKeycloak().authenticated) {
                openKeycloakAccountSecurity();
              }
            }}
          >
            <IonIcon icon={shieldOutline} slot="start" color="medium" />
            <IonLabel>Change Password</IonLabel>
            <IonNote slot="end">Opens Keycloak account</IonNote>
          </IonItem>

          <IonItem className="settings-item">
            <IonIcon icon={fingerPrintOutline} slot="start" color="medium" />
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
            <IonIcon icon={informationCircleOutline} slot="start" color="medium" />
            <IonLabel>Version</IonLabel>
            <IonNote slot="end">{APP_VERSION}</IonNote>
          </IonItem>

          <IonItem button detail className="settings-item" routerLink="/about">
            <IonIcon icon={informationCircleOutline} slot="start" color="medium" />
            <IonLabel>About MediTap</IonLabel>
          </IonItem>

          <IonItem button detail className="settings-item">
            <IonIcon icon={shieldOutline} slot="start" color="medium" />
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
