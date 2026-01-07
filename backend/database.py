from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from datetime import datetime
import os

# PostgreSQL connection
POSTGRES_URL = os.getenv("POSTGRES_URL", "postgresql://admin:strongpassword@localhost:5432/learning_platform")
# Convert to asyncpg format
ASYNC_POSTGRES_URL = POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_POSTGRES_URL, echo=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'teacher' or 'student'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    is_public = Column(Boolean, default=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CourseStudent(Base):
    __tablename__ = "course_students"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_email = Column(String, nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())

class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # 'video' or 'document'
    file_url = Column(String, nullable=False)
    file_key = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ PostgreSQL tables created")

async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()