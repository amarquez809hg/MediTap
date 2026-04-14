import { Redirect, Route } from 'react-router-dom';
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
import Tab11 from './pages/Tab11';
import Tab12 from './pages/Tab12';
import Tab13 from './pages/Tab13';
import Tab14 from './pages/Tab14';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';

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
import './theme/meditap-shared.css';

setupIonicReact();

const AppRoutes: React.FC = () => {
  const { keycloakReady } = useAuth();

  if (!keycloakReady) {
    return (
      <IonApp>
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
            <p style={{ marginTop: 16 }}>Connecting to sign-in…</p>
          </div>
        </IonContent>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <>
          <SessionExpiredModal />
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

            <Route exact path="/tab1">
              <ProtectedRoute>
                <Tab1 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab2">
              <ProtectedRoute>
                <Tab2 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab4">
              <ProtectedRoute>
                <Tab4 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab5">
              <ProtectedRoute>
                <Tab5 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab6">
              <ProtectedRoute>
                <Tab6 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab7">
              <ProtectedRoute>
                <Tab7 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab11">
              <ProtectedRoute>
                <Tab11 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab12">
              <ProtectedRoute>
                <Tab12 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab13">
              <ProtectedRoute>
                <Tab13 />
              </ProtectedRoute>
            </Route>
            <Route exact path="/tab14">
              <ProtectedRoute>
                <Tab14 />
              </ProtectedRoute>
            </Route>

            <Route exact path="/">
              <Redirect to="/tab3" />
            </Route>
          </IonRouterOutlet>
        </>
      </IonReactRouter>
    </IonApp>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;
