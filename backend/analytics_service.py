from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from analytics import (
    UserActivity, TestAnalytics, CourseAnalytics, 
    EnrollmentAnalytics, MaterialAnalytics, DailyMetrics
)
from datetime import datetime, timedelta
from typing import Optional, Dict, List

class AnalyticsService:
    """Service for logging and querying analytics data"""
    
    @staticmethod
    async def log_user_activity(
        db: AsyncSession,
        user_id: str,
        email: str,
        role: str,
        action: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict] = None
    ):
        """Log user activity"""
        activity = UserActivity(
            user_id=user_id,
            email=email,
            role=role,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata
        )
        db.add(activity)
        await db.commit()
    
    @staticmethod
    async def log_test_submission(
        db: AsyncSession,
        test_id: str,
        course_id: str,
        student_id: str,
        student_email: str,
        score: float,
        total_questions: int,
        correct_answers: int,
        time_taken_seconds: Optional[int] = None,
        questions_data: Optional[List[Dict]] = None
    ):
        """Log test submission for analytics"""
        test_analytics = TestAnalytics(
            test_id=test_id,
            course_id=course_id,
            student_id=student_id,
            student_email=student_email,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            time_taken_seconds=time_taken_seconds,
            submitted_at=datetime.utcnow(),
            questions_data=questions_data
        )
        db.add(test_analytics)
        await db.commit()
        
        # Update enrollment analytics
        await AnalyticsService._update_enrollment_test_stats(
            db, course_id, student_id, score
        )
        
        # Update course analytics
        await AnalyticsService._update_course_test_stats(db, course_id)
    
    @staticmethod
    async def log_enrollment(
        db: AsyncSession,
        course_id: str,
        student_id: str,
        student_email: str
    ):
        """Log student enrollment"""
        enrollment = EnrollmentAnalytics(
            course_id=course_id,
            student_id=student_id,
            student_email=student_email,
            enrolled_at=datetime.utcnow(),
            first_access=datetime.utcnow()
        )
        db.add(enrollment)
        await db.commit()
        
        # Update course analytics
        await AnalyticsService._increment_course_enrollments(db, course_id)
    
    @staticmethod
    async def log_material_view(
        db: AsyncSession,
        material_id: str,
        course_id: str,
        material_title: str,
        file_type: str,
        viewer_id: str
    ):
        """Log material view"""
        # Check if material analytics exists
        result = await db.execute(
            select(MaterialAnalytics).where(MaterialAnalytics.material_id == material_id)
        )
        material_analytics = result.scalar_one_or_none()
        
        if not material_analytics:
            material_analytics = MaterialAnalytics(
                material_id=material_id,
                course_id=course_id,
                material_title=material_title,
                file_type=file_type,
                total_views=1,
                unique_viewers=1,
                last_viewed=datetime.utcnow()
            )
            db.add(material_analytics)
        else:
            material_analytics.total_views += 1
            material_analytics.last_viewed = datetime.utcnow()
        
        await db.commit()
        
        # Update enrollment analytics
        await AnalyticsService._update_enrollment_material_view(
            db, course_id, viewer_id
        )
    
    @staticmethod
    async def update_course_analytics(
        db: AsyncSession,
        course_id: str,
        course_title: str,
        teacher_id: str
    ):
        """Create or update course analytics record"""
        result = await db.execute(
            select(CourseAnalytics).where(CourseAnalytics.course_id == course_id)
        )
        course_analytics = result.scalar_one_or_none()
        
        if not course_analytics:
            course_analytics = CourseAnalytics(
                course_id=course_id,
                course_title=course_title,
                teacher_id=teacher_id,
                last_activity=datetime.utcnow()
            )
            db.add(course_analytics)
        else:
            course_analytics.course_title = course_title
            course_analytics.last_activity = datetime.utcnow()
        
        await db.commit()
    
    @staticmethod
    async def get_course_analytics(db: AsyncSession, course_id: str) -> Optional[Dict]:
        """Get analytics for a specific course"""
        result = await db.execute(
            select(CourseAnalytics).where(CourseAnalytics.course_id == course_id)
        )
        analytics = result.scalar_one_or_none()
        
        if not analytics:
            return None
        
        return {
            "course_id": analytics.course_id,
            "course_title": analytics.course_title,
            "total_enrollments": analytics.total_enrollments,
            "total_completions": analytics.total_completions,
            "avg_test_score": analytics.avg_test_score,
            "total_materials": analytics.total_materials,
            "total_tests": analytics.total_tests,
            "last_activity": analytics.last_activity.isoformat() if analytics.last_activity else None
        }
    
    @staticmethod
    async def get_student_performance(
        db: AsyncSession,
        student_id: str,
        course_id: Optional[str] = None
    ) -> Dict:
        """Get student performance analytics"""
        query = select(TestAnalytics).where(TestAnalytics.student_id == student_id)
        
        if course_id:
            query = query.where(TestAnalytics.course_id == course_id)
        
        result = await db.execute(query.order_by(TestAnalytics.submitted_at.desc()))
        tests = result.scalars().all()
        
        if not tests:
            return {
                "total_tests": 0,
                "avg_score": 0,
                "highest_score": 0,
                "lowest_score": 0,
                "recent_tests": []
            }
        
        scores = [t.score for t in tests]
        
        return {
            "total_tests": len(tests),
            "avg_score": sum(scores) / len(scores),
            "highest_score": max(scores),
            "lowest_score": min(scores),
            "recent_tests": [
                {
                    "test_id": t.test_id,
                    "course_id": t.course_id,
                    "score": t.score,
                    "submitted_at": t.submitted_at.isoformat()
                }
                for t in tests[:5]
            ]
        }
    
    @staticmethod
    async def get_teacher_dashboard(db: AsyncSession, teacher_id: str) -> Dict:
        """Get teacher dashboard analytics"""
        # Get all courses for this teacher
        result = await db.execute(
            select(CourseAnalytics).where(CourseAnalytics.teacher_id == teacher_id)
        )
        courses = result.scalars().all()
        
        course_ids = [c.course_id for c in courses]
        
        # Get total enrollments
        result = await db.execute(
            select(func.count(EnrollmentAnalytics.id))
            .where(EnrollmentAnalytics.course_id.in_(course_ids) if course_ids else False)
        )
        total_enrollments = result.scalar() or 0
        
        # Get total test submissions
        result = await db.execute(
            select(func.count(TestAnalytics.id))
            .where(TestAnalytics.course_id.in_(course_ids) if course_ids else False)
        )
        total_submissions = result.scalar() or 0
        
        # Get average score across all courses
        result = await db.execute(
            select(func.avg(TestAnalytics.score))
            .where(TestAnalytics.course_id.in_(course_ids) if course_ids else False)
        )
        avg_score = result.scalar() or 0
        
        return {
            "total_courses": len(courses),
            "total_enrollments": total_enrollments,
            "total_submissions": total_submissions,
            "avg_score": float(avg_score) if avg_score else 0,
            "courses": [
                {
                    "course_id": c.course_id,
                    "title": c.course_title,
                    "enrollments": c.total_enrollments,
                    "avg_score": c.avg_test_score or 0
                }
                for c in courses
            ]
        }
    
    @staticmethod
    async def get_enrollment_analytics(
        db: AsyncSession,
        course_id: str
    ) -> List[Dict]:
        """Get enrollment analytics for a course"""
        result = await db.execute(
            select(EnrollmentAnalytics)
            .where(EnrollmentAnalytics.course_id == course_id)
            .order_by(EnrollmentAnalytics.enrolled_at.desc())
        )
        enrollments = result.scalars().all()
        
        return [
            {
                "student_id": e.student_id,
                "student_email": e.student_email,
                "enrolled_at": e.enrolled_at.isoformat(),
                "last_access": e.last_access.isoformat() if e.last_access else None,
                "materials_viewed": e.materials_viewed,
                "tests_taken": e.tests_taken,
                "avg_test_score": e.avg_test_score or 0,
                "is_active": e.is_active
            }
            for e in enrollments
        ]
    
    @staticmethod
    async def get_platform_metrics(
        db: AsyncSession,
        days: int = 30
    ) -> Dict:
        """Get platform-wide metrics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # User activities
        result = await db.execute(
            select(func.count(UserActivity.id.distinct()))
            .where(UserActivity.timestamp >= start_date)
        )
        active_users = result.scalar() or 0
        
        # Test submissions
        result = await db.execute(
            select(
                func.count(TestAnalytics.id),
                func.avg(TestAnalytics.score)
            )
            .where(TestAnalytics.submitted_at >= start_date)
        )
        test_data = result.first()
        total_submissions = test_data[0] or 0
        avg_score = float(test_data[1]) if test_data[1] else 0
        
        # Enrollments
        result = await db.execute(
            select(func.count(EnrollmentAnalytics.id))
            .where(EnrollmentAnalytics.enrolled_at >= start_date)
        )
        new_enrollments = result.scalar() or 0
        
        return {
            "period_days": days,
            "active_users": active_users,
            "total_submissions": total_submissions,
            "avg_score": avg_score,
            "new_enrollments": new_enrollments
        }
    
    # Private helper methods
    @staticmethod
    async def _update_enrollment_test_stats(
        db: AsyncSession,
        course_id: str,
        student_id: str,
        score: float
    ):
        """Update enrollment analytics after test submission"""
        result = await db.execute(
            select(EnrollmentAnalytics).where(
                and_(
                    EnrollmentAnalytics.course_id == course_id,
                    EnrollmentAnalytics.student_id == student_id
                )
            )
        )
        enrollment = result.scalar_one_or_none()
        
        if enrollment:
            enrollment.tests_taken += 1
            enrollment.last_access = datetime.utcnow()
            
            # Recalculate average score
            if enrollment.avg_test_score:
                enrollment.avg_test_score = (
                    (enrollment.avg_test_score * (enrollment.tests_taken - 1) + score) 
                    / enrollment.tests_taken
                )
            else:
                enrollment.avg_test_score = score
            
            await db.commit()
    
    @staticmethod
    async def _update_course_test_stats(db: AsyncSession, course_id: str):
        """Update course analytics after test submission"""
        result = await db.execute(
            select(CourseAnalytics).where(CourseAnalytics.course_id == course_id)
        )
        course_analytics = result.scalar_one_or_none()
        
        if course_analytics:
            # Recalculate average test score
            result = await db.execute(
                select(func.avg(TestAnalytics.score))
                .where(TestAnalytics.course_id == course_id)
            )
            avg_score = result.scalar()
            
            course_analytics.avg_test_score = float(avg_score) if avg_score else None
            course_analytics.last_activity = datetime.utcnow()
            
            await db.commit()
    
    @staticmethod
    async def _increment_course_enrollments(db: AsyncSession, course_id: str):
        """Increment enrollment count for a course"""
        result = await db.execute(
            select(CourseAnalytics).where(CourseAnalytics.course_id == course_id)
        )
        course_analytics = result.scalar_one_or_none()
        
        if course_analytics:
            course_analytics.total_enrollments += 1
            course_analytics.last_activity = datetime.utcnow()
            await db.commit()
    
    @staticmethod
    async def _update_enrollment_material_view(
        db: AsyncSession,
        course_id: str,
        student_id: str
    ):
        """Update enrollment analytics after material view"""
        result = await db.execute(
            select(EnrollmentAnalytics).where(
                and_(
                    EnrollmentAnalytics.course_id == course_id,
                    EnrollmentAnalytics.student_id == student_id
                )
            )
        )
        enrollment = result.scalar_one_or_none()
        
        if enrollment:
            enrollment.materials_viewed += 1
            enrollment.last_access = datetime.utcnow()
            await db.commit()