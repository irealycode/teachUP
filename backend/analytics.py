from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from datetime import datetime
import os

POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://admin:strongpassword@localhost:5432/analytics_platform")
ASYNC_POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_POSTGRES_URL, echo=False)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

class UserActivity(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    email = Column(String, index=True)
    role = Column(String, index=True)
    action = Column(String, nullable=False) 
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String)
    user_agent = Column(Text)
    metadata = Column(JSON) 

class TestAnalytics(Base):
    __tablename__ = "test_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(String, index=True, nullable=False)
    course_id = Column(String, index=True, nullable=False)
    student_id = Column(String, index=True, nullable=False)
    student_email = Column(String, index=True)
    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    time_taken_seconds = Column(Integer) 
    submitted_at = Column(DateTime(timezone=True), nullable=False, index=True)
    questions_data = Column(JSON) 

class CourseAnalytics(Base):
    __tablename__ = "course_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String, unique=True, index=True, nullable=False)
    course_title = Column(String)
    teacher_id = Column(String, index=True)
    total_enrollments = Column(Integer, default=0)
    total_completions = Column(Integer, default=0)
    avg_test_score = Column(Float)
    total_materials = Column(Integer, default=0)
    total_tests = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EnrollmentAnalytics(Base):
    __tablename__ = "enrollment_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(String, index=True, nullable=False)
    student_id = Column(String, index=True, nullable=False)
    student_email = Column(String, index=True)
    enrolled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    first_access = Column(DateTime(timezone=True))
    last_access = Column(DateTime(timezone=True))
    total_time_spent_minutes = Column(Integer, default=0)
    materials_viewed = Column(Integer, default=0)
    tests_taken = Column(Integer, default=0)
    avg_test_score = Column(Float)
    is_active = Column(Boolean, default=True)

class MaterialAnalytics(Base):
    __tablename__ = "material_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(String, index=True, nullable=False)
    course_id = Column(String, index=True, nullable=False)
    material_title = Column(String)
    file_type = Column(String, index=True) 
    total_views = Column(Integer, default=0)
    unique_viewers = Column(Integer, default=0)
    avg_view_duration_seconds = Column(Integer)
    last_viewed = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DailyMetrics(Base):
    __tablename__ = "daily_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), unique=True, index=True, nullable=False)
    total_active_users = Column(Integer, default=0)
    total_logins = Column(Integer, default=0)
    new_registrations = Column(Integer, default=0)
    new_courses = Column(Integer, default=0)
    new_enrollments = Column(Integer, default=0)
    tests_submitted = Column(Integer, default=0)
    materials_uploaded = Column(Integer, default=0)
    avg_platform_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

async def init_analytics_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Analytics PostgreSQL tables created")

async def get_analytics_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()