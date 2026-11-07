from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True)
    features = Column(JSON)
    latest_risk_score = Column(Float, nullable=True)
    latest_risk_level = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    predictions = relationship("Prediction", back_populates="student",
                               order_by="Prediction.created_at.desc()")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.student_id"), index=True)
    risk_score = Column(Float)
    risk_level = Column(String)
    shap_values = Column(JSON)
    top_shap_feature = Column(String)
    recommendation = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("Student", back_populates="predictions")
