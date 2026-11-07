from pydantic import BaseModel, Field
from typing import Optional


class StudentFeatures(BaseModel):
    marital_status: float = Field(..., ge=1, le=6)
    application_mode: float = Field(..., ge=1, le=57)
    application_order: float = Field(..., ge=0, le=6)
    course: float = Field(..., ge=33, le=9991)
    daytime_evening_attendance: float = Field(..., ge=0, le=1)
    previous_qualification: float = Field(..., ge=1, le=43)
    previous_qualification_grade: float = Field(..., ge=95, le=190)
    nacionality: float = Field(..., ge=1, le=109)
    mothers_qualification: float = Field(..., ge=1, le=44)
    fathers_qualification: float = Field(..., ge=1, le=44)
    mothers_occupation: float = Field(..., ge=0, le=194)
    fathers_occupation: float = Field(..., ge=0, le=195)
    admission_grade: float = Field(..., ge=95, le=190)
    displaced: float = Field(..., ge=0, le=1)
    educational_special_needs: float = Field(..., ge=0, le=1)
    debtor: float = Field(..., ge=0, le=1)
    tuition_fees_up_to_date: float = Field(..., ge=0, le=1)
    gender: float = Field(..., ge=0, le=1)
    scholarship_holder: float = Field(..., ge=0, le=1)
    age_at_enrollment: float = Field(..., ge=17, le=70)
    international: float = Field(..., ge=0, le=1)
    cu_1st_sem_credited: float = Field(..., ge=0, le=20)
    cu_1st_sem_enrolled: float = Field(..., ge=0, le=26)
    cu_1st_sem_evaluations: float = Field(..., ge=0, le=45)
    cu_1st_sem_approved: float = Field(..., ge=0, le=26)
    cu_1st_sem_grade: float = Field(..., ge=0, le=18.875)
    cu_1st_sem_without_evaluations: float = Field(..., ge=0, le=12)
    cu_2nd_sem_credited: float = Field(..., ge=0, le=19)
    cu_2nd_sem_enrolled: float = Field(..., ge=0, le=23)
    cu_2nd_sem_evaluations: float = Field(..., ge=0, le=33)
    cu_2nd_sem_approved: float = Field(..., ge=0, le=20)
    cu_2nd_sem_grade: float = Field(..., ge=0, le=18.571)
    cu_2nd_sem_without_evaluations: float = Field(..., ge=0, le=12)
    unemployment_rate: float = Field(..., ge=7.6, le=16.2)
    inflation_rate: float = Field(..., ge=-0.8, le=3.7)
    gdp: float = Field(..., ge=-4.06, le=3.51)


class PredictRequest(StudentFeatures):
    student_id: Optional[str] = None


class ShapValue(BaseModel):
    feature: str
    value: float
    shap_value: float


class PredictResponse(BaseModel):
    student_id: Optional[str]
    risk_score: float
    risk_level: str
    top_shap_feature: str
    recommendation: str
    base_value: float
    shap_values: list[ShapValue]


class StudentCreate(StudentFeatures):
    student_id: str


class StudentSummary(BaseModel):
    student_id: str
    course: float
    age_at_enrollment: float
    gender: float
    cu_1st_sem_approved: float
    cu_1st_sem_grade: float
    cu_2nd_sem_approved: float
    cu_2nd_sem_grade: float
    tuition_fees_up_to_date: float
    scholarship_holder: float
    latest_risk_score: Optional[float]
    latest_risk_level: Optional[str]

    model_config = {"from_attributes": True}


class StudentDetail(BaseModel):
    student_id: str
    features: dict
    latest_risk_score: Optional[float]
    latest_risk_level: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


class PredictionHistory(BaseModel):
    id: int
    risk_score: float
    risk_level: str
    top_shap_feature: str
    recommendation: str
    shap_values: dict
    created_at: str

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_students: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    unscored_count: int
    high_risk_pct: float
    medium_risk_pct: float
    low_risk_pct: float
    avg_risk_score: float
    top_shap_features: list[dict]
    recent_high_risk: list[dict]
