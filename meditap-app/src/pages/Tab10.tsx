import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonCard, 
  IonCardContent, 
  IonGrid, 
  IonRow, 
  IonCol,
  IonIcon
} from '@ionic/react';
import { pulseOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import './Tab10.css';

const Tab10: React.FC = () => {

  const problemStatement = `Despite decades of investment in digital health, a gap still exists between where patient data lives and where care is delivered. Platforms like MyChart, HIEs, and lab networks connect parts of the puzzle, but none offer a unified, bedside-ready solution that gives clinicians full access at the moment of care.`;

  const solutionStatement = `Unlike these systems, MediTap empowers patients to securely carry their complete medical history across networks. With cross-system compatibility, consent-first sharing, and a tap-to-access workflow, MediTap closes the gap between data and care.`;

  return (
    <IonPage className="ct-page ct-tab10">
      <IonHeader className="custom-header">
        <IonToolbar>
          <IonTitle>About MediTap</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding custom-content">
        
        {/* Large Title (Collapsed view) */}
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">About Us</IonTitle>
          </IonToolbar>
        </IonHeader>

        <button className="book-btn">
            <a href="http://localhost:8100/tab3" className="nav-item">
            <i className="fas fa-plus"></i> 
            Go back to MediTap login
             </a>
             </button>

        <IonGrid fixed className="about-grid">
          <IonRow className="ion-justify-content-center">
            <IonCol size="12" sizeMd="10">
              
              <h2 className="main-heading">Closing the Data-to-Care Gap</h2>

              {/* Problem Statement Card */}
              <IonCard className="info-card problem-card">
                <IonCardContent>
                  <h3 className="card-title">
                    <IonIcon icon={pulseOutline} /> The Problem
                  </h3>
                  <p className="card-text">{problemStatement}</p>
                </IonCardContent>
              </IonCard>

              {/* Solution Statement Card */}
              <IonCard className="info-card solution-card">
                <IonCardContent>
                  <h3 className="card-title">
                    <IonIcon icon={shieldCheckmarkOutline} /> The MediTap solution
                  </h3>
                  <p className="card-text">{solutionStatement}</p>
                </IonCardContent>
              </IonCard>

            </IonCol>
          </IonRow>
        </IonGrid>
        
      </IonContent>
    </IonPage>
  );
};

export default Tab10;