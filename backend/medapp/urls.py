"""
URL configuration for medapp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from rest_framework_simplejwt.views import TokenVerifyView
from medical import views as mviews
from django.http import JsonResponse
from medapp import staff_elevation_views, epic_views, native_auth_views

def healthz(_request):
    return JsonResponse({"status": "ok"})

router = routers.DefaultRouter()
router.register(r'patients', mviews.PatientViewSet, basename='patient')
router.register(r'hospitals', mviews.HospitalViewSet)
router.register(r'incidents', mviews.IncidentViewSet)
router.register(r'medication-catalog', mviews.MedicationCatalogViewSet)
router.register(r'patient-medications', mviews.PatientMedicationViewSet)
router.register(r'allergy-catalog', mviews.AllergyCatalogViewSet)
router.register(r'patient-allergies', mviews.PatientAllergyViewSet)
router.register(r'insurance-providers', mviews.InsuranceProviderViewSet)
router.register(r'insurance-policies', mviews.InsurancePolicyViewSet)
router.register(r'patient-insurances', mviews.PatientInsuranceViewSet)
router.register(r'chronic-disease-catalog', mviews.ChronicDiseaseCatalogViewSet)
router.register(r'patient-chronic-diseases', mviews.PatientChronicDiseaseViewSet)
router.register(r'lab-results', mviews.LabResultViewSet)
router.register(r'patient-lab-panels', mviews.PatientLabPanelViewSet)

urlpatterns = [
    path("", healthz),  # returns {"status":"ok"}
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path(
        'api/auth/token/',
        native_auth_views.MediTapTokenObtainPairView.as_view(),
        name='token_obtain_pair',
    ),
    path('api/auth/register/', native_auth_views.register, name='auth_register'),
    path('api/auth/me/', native_auth_views.auth_me, name='auth_me'),
    path(
        'api/auth/token/refresh/',
        native_auth_views.MediTapTokenRefreshView.as_view(),
        name='token_refresh',
    ),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path(
        'api/auth/staff-elevate/',
        staff_elevation_views.staff_elevate_patient_intake,
        name='staff_elevate_patient_intake',
    ),
    path(
        'api/auth/staff-elevate/debug/',
        staff_elevation_views.staff_elevate_debug,
        name='staff_elevate_debug',
    ),
    path("api/epic/oauth-config/", epic_views.EpicOAuthConfigView.as_view(), name="epic_oauth_config"),
    path(
        "api/epic/oauth-complete/",
        epic_views.EpicOAuthCompleteView.as_view(),
        name="epic_oauth_complete",
    ),
    path(
        "api/patients/<uuid:patient_id>/epic-link/",
        epic_views.PatientEpicLinkView.as_view(),
        name="patient_epic_link",
    ),
    path(
        "api/patients/<uuid:patient_id>/epic-link/prepare-authorize/",
        epic_views.PrepareEpicAuthorizeView.as_view(),
        name="patient_epic_prepare_authorize",
    ),
]
