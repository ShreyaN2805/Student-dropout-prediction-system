import os
import uuid
from contextlib import asynccontextmanager

import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import engine, get_db, Base
from models import Student, Prediction
from schemas import (
    PredictRequest, PredictResponse, ShapValue,
    StudentCreate, StudentSummary, StudentDetail,
    PredictionHistory, DashboardStats,
)
from ml_engine import engine as ml, FEATURE_MAP
from counseling import get_risk_level, get_recommendation

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "real_student_data.csv")


def seed_database(db: Session):
    """Load students from CSV into the database if empty."""
    count = db.query(Student).count()
    if count > 0:
        return

    df = pd.read_csv(DATA_PATH)
    df = df[df["Target"] != "Enrolled"].copy()

    feature_cols = [c for c in df.columns if c != "Target"]
    students = []
    for i, row in df.iterrows():
        features = {col: row[col] for col in feature_cols}
        sid = f"STU-{i + 1:04d}"
        students.append(Student(student_id=sid, features=features))

    db.bulk_save_objects(students)
    db.commit()


def run_initial_predictions(db: Session):
    """Compute predictions for all students that don't have one yet."""
    unscored = db.query(Student).filter(Student.latest_risk_score.is_(None)).all()
    if not unscored:
        return

    for student in unscored:
        try:
            result = ml.predict(student.features)
            risk_level = get_risk_level(result["risk_score"])
            recommendation = get_recommendation(risk_level, result["top_shap_feature"])

            prediction = Prediction(
                student_id=student.student_id,
                risk_score=result["risk_score"],
                risk_level=risk_level,
                shap_values=result["shap_values"],
                top_shap_feature=result["top_shap_feature"],
                recommendation=recommendation,
            )
            student.latest_risk_score = result["risk_score"]
            student.latest_risk_level = risk_level
            db.add(prediction)
        except Exception:
            continue

    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ml.load()
    db = next(get_db())
    try:
        seed_database(db)
        run_initial_predictions(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Student Dropout Prediction API",
    description="AI-powered dropout risk prediction with SHAP explainability and counseling recommendations",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── PREDICT ────────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest, db: Session = Depends(get_db)):
    features = ml.features_from_api(request.model_dump(exclude={"student_id"}))
    result = ml.predict(features)
    risk_level = get_risk_level(result["risk_score"])
    recommendation = get_recommendation(risk_level, result["top_shap_feature"])

    shap_list = sorted(
        [
            ShapValue(feature=feat, value=features[feat], shap_value=sv)
            for feat, sv in result["shap_values"].items()
        ],
        key=lambda x: abs(x.shap_value),
        reverse=True,
    )

    student_id = request.student_id
    if student_id:
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if student:
            prediction = Prediction(
                student_id=student_id,
                risk_score=result["risk_score"],
                risk_level=risk_level,
                shap_values=result["shap_values"],
                top_shap_feature=result["top_shap_feature"],
                recommendation=recommendation,
            )
            student.latest_risk_score = result["risk_score"]
            student.latest_risk_level = risk_level
            student.features = features
            db.add(prediction)
            db.commit()

    return PredictResponse(
        student_id=student_id,
        risk_score=result["risk_score"],
        risk_level=risk_level,
        top_shap_feature=result["top_shap_feature"],
        recommendation=recommendation,
        base_value=result["base_value"],
        shap_values=shap_list,
    )


# ─── STUDENTS ───────────────────────────────────────────────

@app.get("/students", response_model=list[StudentSummary])
def list_students(
    risk_level: str | None = Query(None, description="Filter: Low, Medium, High"),
    search: str | None = Query(None, description="Search by student_id"),
    sort_by: str = Query("latest_risk_score", description="Sort field"),
    sort_dir: str = Query("desc", description="asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Student)

    if risk_level:
        query = query.filter(Student.latest_risk_level == risk_level)
    if search:
        query = query.filter(Student.student_id.contains(search))

    sort_col = getattr(Student, sort_by, Student.latest_risk_score)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc().nulls_last())

    students = query.offset(skip).limit(limit).all()

    result = []
    for s in students:
        feat = s.features or {}
        api_feat = ml.features_to_api(feat)
        result.append(StudentSummary(
            student_id=s.student_id,
            course=api_feat.get("course", 0),
            age_at_enrollment=api_feat.get("age_at_enrollment", 0),
            gender=api_feat.get("gender", 0),
            cu_1st_sem_approved=api_feat.get("cu_1st_sem_approved", 0),
            cu_1st_sem_grade=api_feat.get("cu_1st_sem_grade", 0),
            cu_2nd_sem_approved=api_feat.get("cu_2nd_sem_approved", 0),
            cu_2nd_sem_grade=api_feat.get("cu_2nd_sem_grade", 0),
            tuition_fees_up_to_date=api_feat.get("tuition_fees_up_to_date", 0),
            scholarship_holder=api_feat.get("scholarship_holder", 0),
            latest_risk_score=s.latest_risk_score,
            latest_risk_level=s.latest_risk_level,
        ))
    return result


@app.get("/students/count")
def student_count(
    risk_level: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(func.count(Student.id))
    if risk_level:
        query = query.filter(Student.latest_risk_level == risk_level)
    if search:
        query = query.filter(Student.student_id.contains(search))
    return {"total": query.scalar()}


@app.get("/students/{student_id}", response_model=StudentDetail)
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    api_features = ml.features_to_api(student.features or {})

    return StudentDetail(
        student_id=student.student_id,
        features=api_features,
        latest_risk_score=student.latest_risk_score,
        latest_risk_level=student.latest_risk_level,
        created_at=student.created_at.isoformat() if student.created_at else "",
    )


@app.get("/students/{student_id}/history", response_model=list[PredictionHistory])
def get_history(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    preds = (
        db.query(Prediction)
        .filter(Prediction.student_id == student_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    return [
        PredictionHistory(
            id=p.id,
            risk_score=p.risk_score,
            risk_level=p.risk_level,
            top_shap_feature=p.top_shap_feature,
            recommendation=p.recommendation,
            shap_values=p.shap_values or {},
            created_at=p.created_at.isoformat() if p.created_at else "",
        )
        for p in preds
    ]


@app.post("/students", response_model=StudentDetail)
def create_student(request: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.student_id == request.student_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Student ID already exists")

    features = ml.features_from_api(request.model_dump(exclude={"student_id"}))

    student = Student(student_id=request.student_id, features=features)
    db.add(student)
    db.commit()
    db.refresh(student)

    result = ml.predict(features)
    risk_level = get_risk_level(result["risk_score"])
    recommendation = get_recommendation(risk_level, result["top_shap_feature"])

    prediction = Prediction(
        student_id=student.student_id,
        risk_score=result["risk_score"],
        risk_level=risk_level,
        shap_values=result["shap_values"],
        top_shap_feature=result["top_shap_feature"],
        recommendation=recommendation,
    )
    student.latest_risk_score = result["risk_score"]
    student.latest_risk_level = risk_level
    db.add(prediction)
    db.commit()
    db.refresh(student)

    api_features = ml.features_to_api(student.features or {})
    return StudentDetail(
        student_id=student.student_id,
        features=api_features,
        latest_risk_score=student.latest_risk_score,
        latest_risk_level=student.latest_risk_level,
        created_at=student.created_at.isoformat() if student.created_at else "",
    )


# ─── DASHBOARD ──────────────────────────────────────────────

@app.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Student.id)).scalar()
    high = db.query(func.count(Student.id)).filter(Student.latest_risk_level == "High").scalar()
    medium = db.query(func.count(Student.id)).filter(Student.latest_risk_level == "Medium").scalar()
    low = db.query(func.count(Student.id)).filter(Student.latest_risk_level == "Low").scalar()
    unscored = total - high - medium - low
    scored = total - unscored if total else 1

    avg_score = db.query(func.avg(Student.latest_risk_score)).scalar() or 0.0

    recent_high = (
        db.query(Student)
        .filter(Student.latest_risk_level == "High")
        .order_by(Student.latest_risk_score.desc())
        .limit(5)
        .all()
    )

    recent_preds = (
        db.query(Prediction)
        .order_by(Prediction.created_at.desc())
        .limit(500)
        .all()
    )
    shap_totals: dict[str, float] = {}
    for p in recent_preds:
        if p.shap_values:
            for feat, val in p.shap_values.items():
                shap_totals[feat] = shap_totals.get(feat, 0) + abs(val)

    top_shap = sorted(shap_totals.items(), key=lambda x: x[1], reverse=True)[:8]
    top_shap_list = [
        {"feature": feat, "importance": round(val / len(recent_preds), 4)}
        for feat, val in top_shap
    ]

    return DashboardStats(
        total_students=total,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        unscored_count=unscored,
        high_risk_pct=round(high / scored * 100, 1) if scored else 0,
        medium_risk_pct=round(medium / scored * 100, 1) if scored else 0,
        low_risk_pct=round(low / scored * 100, 1) if scored else 0,
        avg_risk_score=round(avg_score, 4),
        top_shap_features=top_shap_list,
        recent_high_risk=[
            {
                "student_id": s.student_id,
                "risk_score": s.latest_risk_score,
            }
            for s in recent_high
        ],
    )


# ─── HEALTH ─────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "XGBoost v1.0", "accuracy": 0.9229}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
