"""
Default lab panels seeded for new patients and via migration (matches SPA mockLabResults / UI samples).
"""

from __future__ import annotations

from datetime import date
from typing import Any

# Unicode en-dashes in reference ranges match the original MediTap mock data.
DEFAULT_LAB_PANELS_SEED: list[dict[str, Any]] = [
    {
        "display_code": "L-2024-001",
        "test_name": "Complete Blood Count (CBC)",
        "collected_on": date(2025, 11, 5),
        "status": "Reviewed",
        "is_new": True,
        "components": [
            {
                "name": "Hemoglobin",
                "value": 14.5,
                "unit": "g/dL",
                "range": "13.5–17.5",
                "critical": False,
            },
            {
                "name": "WBC Count",
                "value": 9.8,
                "unit": "K/uL",
                "range": "4.5–11.0",
                "critical": False,
            },
            {
                "name": "Platelets",
                "value": 135,
                "unit": "K/uL",
                "range": "150–450",
                "critical": True,
                "interpretation": "Low",
            },
        ],
    },
    {
        "display_code": "L-2024-002",
        "test_name": "Basic Metabolic Panel (BMP)",
        "collected_on": date(2025, 10, 10),
        "status": "Reviewed",
        "is_new": False,
        "components": [
            {
                "name": "Glucose (Fasting)",
                "value": 115,
                "unit": "mg/dL",
                "range": "70–99",
                "critical": True,
                "interpretation": "High",
            },
            {
                "name": "Potassium",
                "value": 4.1,
                "unit": "mmol/L",
                "range": "3.5–5.1",
                "critical": False,
            },
            {
                "name": "Creatinine",
                "value": 0.9,
                "unit": "mg/dL",
                "range": "0.6–1.3",
                "critical": False,
            },
        ],
    },
    {
        "display_code": "L-2024-003",
        "test_name": "Lipid Panel",
        "collected_on": date(2025, 8, 15),
        "status": "Pending",
        "is_new": False,
        "components": [],
    },
]


def seed_default_lab_panels_if_empty(patient) -> int:
    """If the patient has no lab panels, insert the canonical demo rows. Returns count created."""
    from medical.models import PatientLabPanel

    if PatientLabPanel.objects.filter(patient=patient).exists():
        return 0
    for row in DEFAULT_LAB_PANELS_SEED:
        PatientLabPanel.objects.create(patient=patient, **row)
    return len(DEFAULT_LAB_PANELS_SEED)
