import json
import os
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
import shap

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "xgboost_model.json")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler_params.json")

FEATURE_MAP = {
    "marital_status": "Marital Status",
    "application_mode": "Application mode",
    "application_order": "Application order",
    "course": "Course",
    "daytime_evening_attendance": "Daytime/evening attendance",
    "previous_qualification": "Previous qualification",
    "previous_qualification_grade": "Previous qualification (grade)",
    "nacionality": "Nacionality",
    "mothers_qualification": "Mother's qualification",
    "fathers_qualification": "Father's qualification",
    "mothers_occupation": "Mother's occupation",
    "fathers_occupation": "Father's occupation",
    "admission_grade": "Admission grade",
    "displaced": "Displaced",
    "educational_special_needs": "Educational special needs",
    "debtor": "Debtor",
    "tuition_fees_up_to_date": "Tuition fees up to date",
    "gender": "Gender",
    "scholarship_holder": "Scholarship holder",
    "age_at_enrollment": "Age at enrollment",
    "international": "International",
    "cu_1st_sem_credited": "Curricular units 1st sem (credited)",
    "cu_1st_sem_enrolled": "Curricular units 1st sem (enrolled)",
    "cu_1st_sem_evaluations": "Curricular units 1st sem (evaluations)",
    "cu_1st_sem_approved": "Curricular units 1st sem (approved)",
    "cu_1st_sem_grade": "Curricular units 1st sem (grade)",
    "cu_1st_sem_without_evaluations": "Curricular units 1st sem (without evaluations)",
    "cu_2nd_sem_credited": "Curricular units 2nd sem (credited)",
    "cu_2nd_sem_enrolled": "Curricular units 2nd sem (enrolled)",
    "cu_2nd_sem_evaluations": "Curricular units 2nd sem (evaluations)",
    "cu_2nd_sem_approved": "Curricular units 2nd sem (approved)",
    "cu_2nd_sem_grade": "Curricular units 2nd sem (grade)",
    "cu_2nd_sem_without_evaluations": "Curricular units 2nd sem (without evaluations)",
    "unemployment_rate": "Unemployment rate",
    "inflation_rate": "Inflation rate",
    "gdp": "GDP",
}

REVERSE_FEATURE_MAP = {v: k for k, v in FEATURE_MAP.items()}


class MLEngine:
    def __init__(self):
        self.model = None
        self.explainer = None
        self.feature_columns = []
        self.min_values = []
        self.scale = []

    def load(self):
        self.model = XGBClassifier()
        self.model.load_model(MODEL_PATH)

        with open(SCALER_PATH) as f:
            params = json.load(f)
        self.feature_columns = params["feature_columns"]
        self.min_values = np.array(params["min_values"])
        self.scale = np.array(params["scale"])

        self.explainer = shap.TreeExplainer(self.model)

    def _scale(self, df: pd.DataFrame) -> pd.DataFrame:
        scaled = (df.values - self.min_values) * self.scale
        scaled = np.clip(scaled, 0, 1)
        return pd.DataFrame(scaled, columns=self.feature_columns)

    def features_from_api(self, data: dict) -> dict:
        """Convert snake_case API fields to original feature names."""
        return {FEATURE_MAP[k]: v for k, v in data.items() if k in FEATURE_MAP}

    def features_to_api(self, data: dict) -> dict:
        """Convert original feature names to snake_case API fields."""
        return {REVERSE_FEATURE_MAP[k]: v for k, v in data.items() if k in REVERSE_FEATURE_MAP}

    def predict(self, features: dict) -> dict:
        df = pd.DataFrame([features])[self.feature_columns]
        df_scaled = self._scale(df)

        proba = self.model.predict_proba(df_scaled)[0][1]
        shap_values = self.explainer.shap_values(df_scaled)[0]

        shap_dict = {}
        for i, col in enumerate(self.feature_columns):
            shap_dict[col] = round(float(shap_values[i]), 4)

        sorted_shap = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
        top_feature = sorted_shap[0][0]

        return {
            "risk_score": round(float(proba), 4),
            "shap_values": shap_dict,
            "top_shap_feature": top_feature,
            "base_value": round(float(self.explainer.expected_value), 4),
        }


engine = MLEngine()
