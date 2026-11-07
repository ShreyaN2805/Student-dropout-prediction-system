RISK_THRESHOLDS = {"low": 0.4, "high": 0.7}

SHAP_RECOMMENDATIONS = {
    "Curricular units 2nd sem (approved)": (
        "Academic Intervention: Student failed most 2nd semester units. "
        "Assign subject-specific tutor and create a structured study plan."
    ),
    "Curricular units 1st sem (approved)": (
        "Academic Intervention: Poor 1st semester performance detected. "
        "Assign academic mentor and schedule weekly progress reviews."
    ),
    "Curricular units 2nd sem (grade)": (
        "Grade Recovery: Low 2nd semester grades. "
        "Enroll in supplementary classes and assign peer study group."
    ),
    "Curricular units 1st sem (grade)": (
        "Grade Recovery: Low 1st semester grades. "
        "Recommend foundation course revision and tutoring sessions."
    ),
    "Tuition fees up to date": (
        "Financial Alert: Tuition fees unpaid. "
        "Refer to financial services, check scholarship/grant eligibility."
    ),
    "Scholarship holder": (
        "Financial Support: No scholarship detected for at-risk student. "
        "Review scholarship eligibility and initiate financial aid application."
    ),
    "Debtor": (
        "Debt Management: Student has outstanding debts. "
        "Refer to financial counselor and explore payment plan options."
    ),
    "Age at enrollment": (
        "Mature Student Support: Age-related risk factor identified. "
        "Connect with mature student support program and flexible scheduling."
    ),
    "Admission grade": (
        "Foundation Support: Low admission grade indicates preparation gaps. "
        "Recommend bridge courses and academic readiness workshops."
    ),
    "Curricular units 1st sem (evaluations)": (
        "Engagement Alert: Low evaluation attempts in 1st semester. "
        "Schedule motivational counseling and academic commitment review."
    ),
    "Curricular units 2nd sem (evaluations)": (
        "Engagement Alert: Low evaluation attempts in 2nd semester. "
        "Urgent follow-up — student may be disengaging from coursework."
    ),
    "Gender": (
        "Demographic Risk: Gender-linked risk pattern detected. "
        "Review gender-specific support programs and mentorship opportunities."
    ),
    "Daytime/evening attendance": (
        "Schedule Adjustment: Attendance mode is a risk factor. "
        "Explore alternative scheduling and flexible study arrangements."
    ),
    "Displaced": (
        "Relocation Support: Displaced student at risk. "
        "Connect with housing support and local community resources."
    ),
    "International": (
        "International Student Support: Cultural/language barriers may exist. "
        "Assign language buddy and connect with international student office."
    ),
    "Unemployment rate": (
        "Economic Context: High unemployment environment affecting motivation. "
        "Career counseling and job placement support recommended."
    ),
    "Inflation rate": (
        "Economic Pressure: Economic conditions contributing to risk. "
        "Review financial hardship support options."
    ),
    "GDP": (
        "Economic Context: Macroeconomic conditions flagged as risk factor. "
        "Strengthen career development and employability workshops."
    ),
}

DEFAULT_RECOMMENDATION = (
    "General Counseling: Schedule a comprehensive review meeting "
    "to assess academic progress and personal well-being."
)

RISK_LEVEL_ACTIONS = {
    "Low": "Routine monitoring. Continue regular academic check-ins.",
    "Medium": (
        "Proactive support needed. Assign a dedicated mentor "
        "and schedule bi-weekly guidance sessions."
    ),
    "High": (
        "Immediate intervention required. Notify parent/guardian, "
        "assign emergency academic support, and schedule urgent counseling."
    ),
}


def get_risk_level(score: float) -> str:
    if score < RISK_THRESHOLDS["low"]:
        return "Low"
    if score < RISK_THRESHOLDS["high"]:
        return "Medium"
    return "High"


def get_recommendation(risk_level: str, top_shap_feature: str) -> str:
    level_action = RISK_LEVEL_ACTIONS[risk_level]
    specific = SHAP_RECOMMENDATIONS.get(top_shap_feature, DEFAULT_RECOMMENDATION)
    return f"{level_action}\n\n{specific}"
