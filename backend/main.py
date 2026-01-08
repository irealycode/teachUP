from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import jwt
import bcrypt
import os
from contextlib import asynccontextmanager
from redis_client import redis_client


from fastapi import File, UploadFile, Form
import mimetypes



@asynccontextmanager
async def lifespan(app: FastAPI):
    
    await redis_client.connect()
    
    yield
    
    await redis_client.disconnect()

app = FastAPI(title="Learning Platform API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")

client = AsyncIOMotorClient(MONGO_URL)

db = client["learning_platform"]


SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
security = HTTPBearer()


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class CourseCreate(BaseModel):
    title: str
    description: str
    is_public: bool = True


class InviteStudent(BaseModel):
    student_email: EmailStr

class QuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: int

class TestCreate(BaseModel):
    course_id: str
    title: str
    questions: List[QuestionCreate]

class TestSubmission(BaseModel):
    test_id: str
    answers: List[int]

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

class MaterialCreate(BaseModel):
    title: str
    file_type: str 
    file_url: str

class Material(BaseModel):
    id: str
    title: str
    file_type: str
    file_url: str
    uploaded_at: str

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def serialize_doc(doc):
    if doc is None:
        return None
    
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        doc.pop("_id")
    
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    
    return doc

def deserialize_doc(doc):
    if doc is None:
        return None
    
    for key, value in doc.items():
        if isinstance(value, str):
            try:
                if 'T' in value or value.endswith('Z'):
                    doc[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                pass
    
    return doc


@app.post("/api/auth/register")
async def register(user: UserRegister):
    print("right")
    
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    
    user_doc = {
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_doc)
    
    token = create_token(str(result.inserted_id), user.email, user.role)
    
    return {
        "token": token,
        "user": {
            "id": str(result.inserted_id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user["_id"]), user["email"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user["role"]
    }


@app.post("/api/courses")
async def create_course(course: CourseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create courses")
    
    course_doc = {
        "title": course.title,
        "description": course.description,
        "is_public": course.is_public,
        "teacher_id": current_user["user_id"],
        "teacher_email": current_user["email"],
        "created_at": datetime.utcnow(),
        "students": []
    }
    result = await db.courses.insert_one(course_doc)
    
    course_doc["id"] = str(result.inserted_id)
    course_doc.pop("_id")
    return course_doc

@app.get("/api/courses")
async def get_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "teacher":
        
        cursor = db.courses.find({"teacher_id": current_user["user_id"]})
    else:
        
        cursor = db.courses.find({
            "$or": [
                {"is_public": True},
                {"students": current_user["email"]}
            ]
        })
    
    courses = []
    async for course in cursor:
        course["id"] = str(course["_id"])
        course.pop("_id")
        courses.append(course)
    
    return courses

@app.put("/api/courses/{course_id}")
async def update_course(course_id: str, course_update: CourseUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update courses")
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id), "teacher_id": current_user["user_id"]})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    update_data = {k: v for k, v in course_update.model_dump().items() if v is not None}
    if update_data:
        await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_data})
    
    updated_course = await db.courses.find_one({"_id": ObjectId(course_id)})
    updated_course["id"] = str(updated_course["_id"])
    updated_course.pop("_id")
    return updated_course



@app.post("/api/courses/{course_id}/materials")
async def upload_material(
    course_id: str,
    title: str = Form(...),
    file_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can upload materials")
    print("this far -1 ")
    
    
    try:
        course = await db.courses.find_one({
            "_id": ObjectId(course_id),
            "teacher_id": current_user["user_id"]
        })
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    
    if file_type not in ["video", "document"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Must be 'video' or 'document'")
    print("this far")
    import secrets
    file_key = secrets.token_urlsafe(16)
    print("this far 1")
    file_extension = file.filename.split('.')[-1] if file.filename else ''
    file_name = f"{file_key}.{file_extension}"
    file_path = f"/uploads/{file_name}"
    print("this far 2")
    
    material_doc = {
        "course_id": course_id,
        "title": title,
        "file_type": file_type,
        "file_url": file_path,
        "file_key": file_key,
        "uploaded_by": current_user["user_id"],
        "uploaded_at": datetime.utcnow()
    }
    print("this far 3")

    result = await db.materials.insert_one(material_doc)
    print("this far 4")
    return {
        "id": str(result.inserted_id),
        "title": title,
        "file_type": file_type,
        "file_url": file_path,
        "uploaded_at": material_doc["uploaded_at"]
    }

@app.get("/api/courses/{course_id}/materials")
async def get_course_materials(course_id: str, current_user: dict = Depends(get_current_user)):
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    
    if current_user["role"] == "student":
        if not course["is_public"] and current_user["email"] not in course.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
    elif current_user["role"] != "teacher" or course["teacher_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    cursor = db.materials.find({"course_id": course_id}).sort("uploaded_at", -1)
    materials = []
    async for material in cursor:
        materials.append({
            "id": str(material["_id"]),
            "title": material["title"],
            "file_type": material["file_type"],
            "file_url": material["file_url"],
            "uploaded_at": material["uploaded_at"]
        })
    
    return materials

@app.delete("/api/courses/{course_id}/materials/{material_id}")
async def delete_material(course_id: str, material_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete materials")
    
    
    try:
        course = await db.courses.find_one({
            "_id": ObjectId(course_id),
            "teacher_id": current_user["user_id"]
        })
        material = await db.materials.find_one({"_id": ObjectId(material_id)})
    except:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if not course or not material:
        raise HTTPException(status_code=404, detail="Material not found or access denied")
    
    await db.materials.delete_one({"_id": ObjectId(material_id)})
    
    return {"message": "Material deleted successfully"}

@app.get("/api/courses/enrolled")
async def get_enrolled_courses(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can view enrolled courses")
    
    
    cursor = db.enrollments.find({"student_id": current_user["user_id"]})
    enrollments = await cursor.to_list(length=None)
    
    if not enrollments:
        return []
    
    course_ids = [ObjectId(e["course_id"]) for e in enrollments]
    cursor = db.courses.find({"_id": {"$in": course_ids}})
    
    courses = []
    async for course in cursor:
        course["id"] = str(course["_id"])
        course.pop("_id")
        courses.append(course)
    
    return courses

@app.get("/api/courses/{course_id}")
async def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    cache_key = f"course:{course_id}"
    cached_course = await redis_client.get(cache_key)
    if cached_course:
        return deserialize_doc(cached_course)
    try:
        
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user["role"] == "student":
        if not course["is_public"] and current_user["email"] not in course.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
    
    course["id"] = str(course["_id"])
    course.pop("_id")

    serialized_course = serialize_doc(course.copy())
    await redis_client.set(cache_key, serialized_course, expire=300)

    return course

@app.put("/api/courses/{course_id}")
async def update_course(course_id: str, course_update: CourseUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update courses")
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id), "teacher_id": current_user["user_id"]})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    update_data = {k: v for k, v in course_update.model_dump().items() if v is not None}
    if update_data:
        await db.courses.update_one({"_id": ObjectId(course_id)}, {"$set": update_data})
    
    updated_course = await db.courses.find_one({"_id": ObjectId(course_id)})
    updated_course["id"] = str(updated_course["_id"])
    updated_course.pop("_id")
    return updated_course

@app.delete("/api/courses/{course_id}")
async def delete_course(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete courses")
    
    try:
        result = await db.courses.delete_one({"_id": ObjectId(course_id), "teacher_id": current_user["user_id"]})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    
    await db.tests.delete_many({"course_id": course_id})
    await db.enrollments.delete_many({"course_id": course_id})
    
    return {"message": "Course deleted successfully"}


@app.post("/api/courses/{course_id}/invite")
async def invite_student(course_id: str, invite: InviteStudent, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can invite students")
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id), "teacher_id": current_user["user_id"]})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    
    await db.courses.update_one(
        {"_id": ObjectId(course_id)},
        {"$addToSet": {"students": invite.student_email}}
    )
    
    return {"message": f"Student {invite.student_email} invited successfully"}

@app.get("/api/courses/{course_id}/students")
async def get_course_students(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view course students")
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id), "teacher_id": current_user["user_id"]})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    
    cursor = db.enrollments.find({"course_id": course_id})
    enrollments = await cursor.to_list(length=None)
    
    student_ids = [ObjectId(e["student_id"]) for e in enrollments]
    if not student_ids:
        return []
    
    cursor = db.users.find({"_id": {"$in": student_ids}})
    students = []
    async for student in cursor:
        students.append({
            "id": str(student["_id"]),
            "email": student["email"],
            "name": student["name"]
        })
    
    return students


@app.post("/api/courses/{course_id}/enroll")
async def enroll_in_course(course_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can enroll in courses")
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    
    if not course["is_public"] and current_user["email"] not in course.get("students", []):
        raise HTTPException(status_code=403, detail="This course is private")
    
    
    existing = await db.enrollments.find_one({
        "course_id": course_id,
        "student_id": current_user["user_id"]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    enrollment_doc = {
        "course_id": course_id,
        "student_id": current_user["user_id"],
        "enrolled_at": datetime.utcnow()
    }
    await db.enrollments.insert_one(enrollment_doc)
    
    return {"message": "Enrolled successfully"}


@app.post("/api/tests")
async def create_test(test: TestCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create tests")
    
    
    try:
        course = await db.courses.find_one({
            "_id": ObjectId(test.course_id),
            "teacher_id": current_user["user_id"]
        })
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or access denied")
    
    test_doc = {
        "course_id": test.course_id,
        "title": test.title,
        "questions": [q.model_dump() for q in test.questions],
        "created_at": datetime.utcnow()
    }
    result = await db.tests.insert_one(test_doc)
    
    test_doc["id"] = str(result.inserted_id)
    test_doc.pop("_id")
    return test_doc

@app.get("/api/courses/{course_id}/tests")
async def get_course_tests(course_id: str, current_user: dict = Depends(get_current_user)):
    
    try:
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user["role"] == "student":
        if not course["is_public"] and current_user["email"] not in course.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
    
    cursor = db.tests.find({"course_id": course_id})
    tests = []
    async for test in cursor:
        test_data = {
            "id": str(test["_id"]),
            "course_id": test["course_id"],
            "title": test["title"],
            "question_count": len(test["questions"]),
            "created_at": test["created_at"]
        }
        
        
        if current_user["role"] == "teacher":
            test_data["questions"] = test["questions"]
        else:
            
            submission = await db.submissions.find_one({
                "test_id": str(test["_id"]),
                "student_id": current_user["user_id"]
            })
            if not submission:
                
                test_data["questions"] = [
                    {
                        "question": q["question"],
                        "options": q["options"]
                    }
                    for q in test["questions"]
                ]
        
        tests.append(test_data)
    
    return tests

@app.get("/api/courses/{course_id}/tests/{test_id}")
async def get_course_tests(course_id ,test_id: str, current_user: dict = Depends(get_current_user)):
    
    try:
        test = await db.tests.find_one({"_id": ObjectId(test_id)})
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
    except:
        raise HTTPException(status_code=404, detail="test not found")
    
    if not test or not course:
        raise HTTPException(status_code=404, detail="test not found")
    
    if current_user["role"] == "student":
        if not course["is_public"] and current_user["email"] not in course.get("students", []):
            raise HTTPException(status_code=403, detail="Access denied")
    
    test_data = {
        "id": str(test["_id"]),
        "course_id": test["course_id"],
        "title": test["title"],
        "question_count": len(test["questions"]),
        "created_at": test["created_at"]
    }
    
    if current_user["role"] == "teacher":
        test_data["questions"] = test["questions"]
    else:
        submission = await db.submissions.find_one({
            "test_id": str(test["_id"]),
            "student_id": current_user["user_id"]
        })
        if not submission:
            test_data["questions"] = [
                {
                    "question": q["question"],
                    "options": q["options"]
                }
                for q in test["questions"]
            ]
        
    
    return test_data

@app.post("/api/tests/submit")
async def submit_test(submission: TestSubmission, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    
    try:
        test = await db.tests.find_one({"_id": ObjectId(submission.test_id)})
    except:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    
    existing = await db.submissions.find_one({
        "test_id": submission.test_id,
        "student_id": current_user["user_id"]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Test already submitted")
    
    
    correct = 0
    total = len(test["questions"])
    for i, answer in enumerate(submission.answers):
        if i < total and answer == test["questions"][i]["correct_answer"]:
            correct += 1
    
    score = (correct / total) * 100 if total > 0 else 0
    
    submission_doc = {
        "test_id": submission.test_id,
        "student_id": current_user["user_id"],
        "answers": submission.answers,
        "score": score,
        "submitted_at": datetime.utcnow()
    }
    await db.submissions.insert_one(submission_doc)
    
    return {
        "score": score,
        "correct": correct,
        "total": total
    }

@app.get("/api/tests/{test_id}/submissions")
async def get_test_submissions(test_id: str, current_user: dict = Depends(get_current_user)):
    
    try:
        test = await db.tests.find_one({"_id": ObjectId(test_id)})
    except:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    
    course = await db.courses.find_one({
        "_id": ObjectId(test["course_id"]),
        "teacher_id": current_user["user_id"]
    })
    
    if not course and current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Access denied")
    
    if current_user["role"] == "student":
        
        submission = await db.submissions.find_one({
            "test_id": test_id,
            "student_id": current_user["user_id"]
        })
        if not submission:
            return None
        
        submission["id"] = str(submission["_id"])
        submission.pop("_id")
        return submission
    else:
        
        cursor = db.submissions.find({"test_id": test_id})
        submissions = []
        async for sub in cursor:
            
            student = await db.users.find_one({"_id": ObjectId(sub["student_id"])})
            submissions.append({
                "id": str(sub["_id"]),
                "student_name": student["name"] if student else "Unknown",
                "student_email": student["email"] if student else "Unknown",
                "score": sub["score"],
                "submitted_at": sub["submitted_at"]
            })
        
        return submissions



@app.get("/")
async def root():
    return {"message": "Learning Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
