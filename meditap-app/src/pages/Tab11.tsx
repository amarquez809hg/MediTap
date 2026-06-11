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
  IonActionSheet,
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
import { useTranslation } from 'react-i18next';
import './Tab11.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase } from '../config/api';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { MediTapLocale } from '../i18n/localeSync';

function fullAppUrl(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${seg}`;
}

const LS_PUSH = 'meditap_settings_push_notifications';
const APP_VERSION = '0.0.1';

const Tab11: React.FC = () => {
  const { t } = useTranslation();
  const { logout, isStaff, isSuperuser } = useAuth();
  const { locale, setLocale, localeLabel } = useLanguage();
  const djangoAdminUrl = `${getApiBase().replace(/\/$/, '')}/admin/`;
  const { dark: darkModeEnabled, setDark: setDarkMode } = useDarkMode();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);

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

  const pickLocale = (next: MediTapLocale) => {
    setLocale(next);
    setLanguageSheetOpen(false);
  };

  return (
    <IonPage className="ct-page ct-tab11">
      <IonContent fullscreen className="settings-page-content">
        <div className="settings-container">
          <header className="settings-header">
            <h1>
              <i className="fas fa-cog" aria-hidden />
              {t('settings.title')}
            </h1>
            <div className="settings-header__actions">
              <a
                href={fullAppUrl('/tab1')}
                className="book-btn patient-insurance-header__action-btn"
              >
                <i className="fas fa-arrow-left" aria-hidden />
                {t('common.goBackToDashboard')}
              </a>
            </div>
          </header>

          <main className="settings-main">
            <div className="settings-list">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">
                  {t('settings.generalPreferences')}
                </span>
              </div>
              <IonList lines="none" className="settings-list-ion">
                <IonItem className="settings-item">
                  <IonIcon icon={notificationsOutline} slot="start" />
                  <IonLabel>{t('settings.pushNotifications')}</IonLabel>
                  <IonToggle
                    checked={notificationsEnabled}
                    onIonChange={(e) => persistNotifications(e.detail.checked)}
                    slot="end"
                  />
                </IonItem>

                <IonItem
                  button
                  detail
                  className="settings-item"
                  onClick={() => setLanguageSheetOpen(true)}
                >
                  <IonIcon icon={languageOutline} slot="start" />
                  <IonLabel>{t('language.label')}</IonLabel>
                  <IonNote slot="end">{localeLabel(locale)}</IonNote>
                </IonItem>

                <IonItem className="settings-item">
                  <IonIcon icon={moonOutline} slot="start" />
                  <IonLabel>{t('settings.darkMode')}</IonLabel>
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
                  <span className="settings-glass-subtitle__label">
                    {t('settings.administration')}
                  </span>
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
                    <IonLabel>{t('settings.djangoAdmin')}</IonLabel>
                    <IonNote slot="end">{t('settings.djangoAdminNote')}</IonNote>
                  </IonItem>
                  {isSuperuser && (
                    <IonItem className="settings-item">
                      <IonIcon icon={informationCircleOutline} slot="start" />
                      <IonLabel>{t('settings.superuser')}</IonLabel>
                      <IonNote slot="end">{t('settings.superuserNote')}</IonNote>
                    </IonItem>
                  )}
                </IonList>
              </div>
            )}

            <div className="settings-list settings-list--spaced">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">
                  {t('settings.securityPrivacy')}
                </span>
              </div>
              <IonList lines="none" className="settings-list-ion">
                <IonItem className="settings-item">
                  <IonIcon icon={shieldOutline} slot="start" />
                  <IonLabel>{t('settings.password')}</IonLabel>
                  <IonNote slot="end">{t('settings.passwordNote')}</IonNote>
                </IonItem>

                <IonItem className="settings-item">
                  <IonIcon icon={fingerPrintOutline} slot="start" />
                  <IonLabel>{t('settings.biometricLock')}</IonLabel>
                  <IonNote slot="end">{t('settings.biometricNote')}</IonNote>
                </IonItem>
              </IonList>
            </div>

            <div className="settings-list settings-list--spaced">
              <div className="settings-glass-subtitle" role="heading" aria-level={2}>
                <span className="settings-glass-subtitle__label">
                  {t('settings.appInformation')}
                </span>
              </div>
              <IonList lines="none" className="settings-list-ion">
                <IonItem button detail className="settings-item">
                  <IonIcon icon={informationCircleOutline} slot="start" />
                  <IonLabel>{t('settings.version')}</IonLabel>
                  <IonNote slot="end">{APP_VERSION}</IonNote>
                </IonItem>

                <IonItem button detail className="settings-item" routerLink="/about">
                  <IonIcon icon={informationCircleOutline} slot="start" />
                  <IonLabel>{t('settings.aboutMediTap')}</IonLabel>
                </IonItem>

                <IonItem button detail className="settings-item">
                  <IonIcon icon={shieldOutline} slot="start" />
                  <IonLabel>{t('settings.privacyPolicy')}</IonLabel>
                </IonItem>
              </IonList>
            </div>

            <Link
              to="/tab3"
              className="settings-footer-btn settings-footer-btn--report"
            >
              <IonIcon icon={shieldOutline} aria-hidden />
              {t('settings.reportCardLost')}
            </Link>

            <button
              type="button"
              className="settings-footer-btn settings-footer-btn--logout"
              onClick={() => setShowLogoutAlert(true)}
            >
              <IonIcon icon={logOutOutline} aria-hidden />
              {t('common.logout')}
            </button>
          </main>
        </div>
      </IonContent>

      <IonActionSheet
        isOpen={languageSheetOpen}
        onDidDismiss={() => setLanguageSheetOpen(false)}
        header={t('language.choose')}
        buttons={[
          {
            text: localeLabel('en'),
            handler: () => pickLocale('en'),
          },
          {
            text: localeLabel('es'),
            handler: () => pickLocale('es'),
          },
          {
            text: t('common.cancel'),
            role: 'cancel',
          },
        ]}
      />

      <IonAlert
        isOpen={showLogoutAlert}
        onDidDismiss={() => setShowLogoutAlert(false)}
        header={t('settings.confirmLogoutTitle')}
        message={t('settings.confirmLogoutMessage')}
        buttons={[
          {
            text: t('common.cancel'),
            role: 'cancel',
            cssClass: 'secondary',
          },
          {
            text: t('settings.confirmLogoutButton'),
            handler: handleLogout,
          },
        ]}
      />
    </IonPage>
  );
};

export default Tab11;
