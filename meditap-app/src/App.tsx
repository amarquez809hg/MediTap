import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonContent,
  IonRouterOutlet,
  IonSpinner,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import Tab4 from './pages/Tab4';
import Tab5 from './pages/Tab5';
import Tab6 from './pages/Tab6';
import Tab7 from './pages/Tab7';
import Tab8 from './pages/Tab8';
import Tab9 from './pages/Tab9';
import Tab10 from './pages/Tab10';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import Tab11 from './pages/Tab11';
import Tab12 from './pages/Tab12';
import Tab13 from './pages/Tab13';
import Tab14 from './pages/Tab14';
import EpicCallback from './pages/EpicCallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPortalRoute from './components/AdminPortalRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import CookieConsentBanner from './components/CookieConsentBanner';
import UserPortalLayout from './portals/UserPortalLayout';
import AdminPortalLayout from './portals/AdminPortalLayout';
import AdminPortalHome from './portals/AdminPortalHome';
import { LEGACY_TAB_REDIRECTS, LOGIN_PATH, resolvePostLoginPath } from './portals/portalPaths';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables + shared MediTap UI */
import './theme/variables.css';
/* Ionic dark palette (text / item / step colors); MediTap overrides come next */
import '@ionic/react/css/palettes/dark.class.css';
import './theme/meditap-ion-dark-overrides.css';
import './theme/meditap-shared.css';

setupIonicReact();

const RootRoute: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, portalHome } = useAuth();
  const params = new URLSearchParams(location.search);
  const isEpicOAuthReturn = Boolean(params.get('code') && params.get('state'));

  if (isEpicOAuthReturn) {
    return (
      <ProtectedRoute>
        <EpicCallback />
      </ProtectedRoute>
    );
  }

  if (isAuthenticated) {
    return <Redirect to={resolvePostLoginPath(portalHome)} />;
  }

  return <Redirect to={LOGIN_PATH} />;
};

const LegacyTabRedirect: React.FC<{ from: string }> = ({ from }) => {
  const to = LEGACY_TAB_REDIRECTS[from];
  return <Redirect to={to || LOGIN_PATH} />;
};

const AppRoutes: React.FC = () => {
  const { t } = useTranslation();
  const { authReady } = useAuth();
  const { dark } = useDarkMode();
  const ionAppClass = dark ? 'ion-palette-dark' : undefined;

  if (!authReady) {
    return (
      <IonApp className={ionAppClass}>
        <IonContent
          className="ion-padding"
          style={{
            '--background': '#0f1419',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100%',
              color: '#a8b0bc',
            }}
          >
            <IonSpinner name="crescent" />
            <p style={{ marginTop: 16 }}>{t('app.loading')}</p>
          </div>
        </IonContent>
      </IonApp>
    );
  }

  return (
    <IonApp className={ionAppClass}>
      <IonReactRouter>
        <>
          <SessionExpiredModal />
          <CookieConsentBanner />
          <IonRouterOutlet animated={false}>
            <Route exact path="/tab3">
              <Tab3 />
            </Route>
            <Route exact path="/tab9">
              <Tab9 />
            </Route>
            <Route exact path="/tab8">
              <Tab8 />
            </Route>
            <Route exact path="/tab10">
              <Tab10 />
            </Route>
            <Route exact path="/terms">
              <TermsPage />
            </Route>
            <Route exact path="/privacy">
              <PrivacyPage />
            </Route>
            <Route exact path="/forgot-password">
              <ForgotPasswordPage />
            </Route>
            <Route exact path="/reset-password">
              <ResetPasswordPage />
            </Route>
            <Route exact path="/onboarding">
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            </Route>

            {/* User portal */}
            <Route exact path="/app/dashboard">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab1 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/status">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab2 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/appointments">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab4 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/conditions">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab5 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/incidents">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab6 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/labs">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab7 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/settings">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab11 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/insurance">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab12 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>
            <Route exact path="/app/intake">
              <ProtectedRoute>
                <UserPortalLayout>
                  <Tab14 />
                </UserPortalLayout>
              </ProtectedRoute>
            </Route>

            {/* Admin portal */}
            <Route exact path="/admin-portal/home">
              <AdminPortalRoute>
                <AdminPortalLayout>
                  <AdminPortalHome />
                </AdminPortalLayout>
              </AdminPortalRoute>
            </Route>
            <Route exact path="/admin-portal/panel">
              <AdminPortalRoute>
                <AdminPortalLayout>
                  <Tab13 />
                </AdminPortalLayout>
              </AdminPortalRoute>
            </Route>

            {/* Legacy /tabN → clean portal paths */}
            {Object.keys(LEGACY_TAB_REDIRECTS).map((from) => (
              <Route exact path={from} key={from}>
                <LegacyTabRedirect from={from} />
              </Route>
            ))}

            <Route exact path="/epic-callback">
              <ProtectedRoute>
                <EpicCallback />
              </ProtectedRoute>
            </Route>

            <Route exact path="/">
              <RootRoute />
            </Route>
          </IonRouterOutlet>
        </>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <UserPreferencesProvider>
      <LanguageProvider>
        <DarkModeProvider>
          <AppRoutes />
        </DarkModeProvider>
      </LanguageProvider>
    </UserPreferencesProvider>
  </AuthProvider>
);

export default App;
