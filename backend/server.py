from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Union
import uuid
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class CategoryBase(BaseModel):
    name: str
    color: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CountdownBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: datetime
    notify_before: Optional[int] = None  # minutes before to notify
    is_timer: bool = False  # True for timer, False for specific date

class CountdownCreate(CountdownBase):
    pass

class Countdown(CountdownBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_completed: bool = False

class HabitBase(BaseModel):
    title: str
    description: Optional[str] = None
    frequency: str  # "daily", "weekly", "custom"
    custom_days: Optional[List[int]] = None  # Days of week (0-6) for custom frequency
    category_id: Optional[str] = None

class HabitCreate(HabitBase):
    pass

class Habit(HabitBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HabitLogBase(BaseModel):
    habit_id: str
    completed_at: datetime

class HabitLogCreate(HabitLogBase):
    pass

class HabitLog(HabitLogBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class HabitStats(BaseModel):
    habit_id: str
    title: str
    total_completions: int
    current_streak: int
    longest_streak: int
    completion_rate: float

# Category Routes
@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    category_obj = Category(**category.dict())
    await db.categories.insert_one(category_obj.dict())
    return category_obj

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(1000)
    return [Category(**category) for category in categories]

@api_router.get("/categories/{category_id}", response_model=Category)
async def get_category(category_id: str):
    category = await db.categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Countdown Routes
@api_router.post("/countdowns", response_model=Countdown)
async def create_countdown(countdown: CountdownCreate):
    countdown_obj = Countdown(**countdown.dict())
    await db.countdowns.insert_one(countdown_obj.dict())
    return countdown_obj

@api_router.get("/countdowns", response_model=List[Countdown])
async def get_countdowns():
    countdowns = await db.countdowns.find().to_list(1000)
    return [Countdown(**countdown) for countdown in countdowns]

@api_router.get("/countdowns/{countdown_id}", response_model=Countdown)
async def get_countdown(countdown_id: str):
    countdown = await db.countdowns.find_one({"id": countdown_id})
    if not countdown:
        raise HTTPException(status_code=404, detail="Countdown not found")
    return Countdown(**countdown)

@api_router.put("/countdowns/{countdown_id}", response_model=Countdown)
async def update_countdown(countdown_id: str, countdown: CountdownCreate):
    existing_countdown = await db.countdowns.find_one({"id": countdown_id})
    if not existing_countdown:
        raise HTTPException(status_code=404, detail="Countdown not found")
    
    updated_countdown = Countdown(**existing_countdown)
    update_data = countdown.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(updated_countdown, key, value)
    
    await db.countdowns.update_one(
        {"id": countdown_id}, {"$set": updated_countdown.dict()}
    )
    return updated_countdown

@api_router.delete("/countdowns/{countdown_id}")
async def delete_countdown(countdown_id: str):
    result = await db.countdowns.delete_one({"id": countdown_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Countdown not found")
    return {"message": "Countdown deleted"}

# Habit Routes
@api_router.post("/habits", response_model=Habit)
async def create_habit(habit: HabitCreate):
    habit_obj = Habit(**habit.dict())
    await db.habits.insert_one(habit_obj.dict())
    return habit_obj

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    habits = await db.habits.find(query).to_list(1000)
    return [Habit(**habit) for habit in habits]

@api_router.get("/habits/{habit_id}", response_model=Habit)
async def get_habit(habit_id: str):
    habit = await db.habits.find_one({"id": habit_id})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return Habit(**habit)

@api_router.put("/habits/{habit_id}", response_model=Habit)
async def update_habit(habit_id: str, habit: HabitCreate):
    existing_habit = await db.habits.find_one({"id": habit_id})
    if not existing_habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    updated_habit = Habit(**existing_habit)
    update_data = habit.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(updated_habit, key, value)
    
    await db.habits.update_one(
        {"id": habit_id}, {"$set": updated_habit.dict()}
    )
    return updated_habit

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str):
    result = await db.habits.delete_one({"id": habit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted"}

# Habit Log Routes
@api_router.post("/habits/{habit_id}/log", response_model=HabitLog)
async def log_habit(habit_id: str, date: Optional[str] = None):
    # Check if habit exists
    habit = await db.habits.find_one({"id": habit_id})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Use provided date or current date
    completed_at = datetime.utcnow()
    if date:
        try:
            completed_at = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Check if already logged for this date
    start_of_day = completed_at.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    existing_log = await db.habit_logs.find_one({
        "habit_id": habit_id,
        "completed_at": {"$gte": start_of_day, "$lt": end_of_day}
    })
    
    if existing_log:
        raise HTTPException(status_code=400, detail="Habit already logged for this date")
    
    # Create new log
    log_data = {
        "habit_id": habit_id,
        "completed_at": completed_at,
        "id": str(uuid.uuid4())
    }
    
    await db.habit_logs.insert_one(log_data)
    return HabitLog(**log_data)

@api_router.get("/habits/{habit_id}/logs", response_model=List[HabitLog])
async def get_habit_logs(
    habit_id: str, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    # Check if habit exists
    habit = await db.habits.find_one({"id": habit_id})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Build query
    query = {"habit_id": habit_id}
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            try:
                date_query["$gte"] = datetime.fromisoformat(start_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid start_date format")
        
        if end_date:
            try:
                date_query["$lt"] = datetime.fromisoformat(end_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid end_date format")
        
        query["completed_at"] = date_query
    
    logs = await db.habit_logs.find(query).to_list(1000)
    return [HabitLog(**log) for log in logs]

@api_router.delete("/habits/{habit_id}/logs/{log_id}")
async def delete_habit_log(habit_id: str, log_id: str):
    # Check if habit exists
    habit = await db.habits.find_one({"id": habit_id})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    result = await db.habit_logs.delete_one({"id": log_id, "habit_id": habit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit log not found")
    
    return {"message": "Habit log deleted"}

# Stats Routes
@api_router.get("/habits/{habit_id}/stats", response_model=HabitStats)
async def get_habit_stats(habit_id: str):
    # Check if habit exists
    habit = await db.habits.find_one({"id": habit_id})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Get all logs for this habit
    logs = await db.habit_logs.find({"habit_id": habit_id}).sort("completed_at", 1).to_list(1000)
    
    if not logs:
        return HabitStats(
            habit_id=habit_id,
            title=habit["title"],
            total_completions=0,
            current_streak=0,
            longest_streak=0,
            completion_rate=0.0
        )
    
    # Calculate total completions
    total_completions = len(logs)
    
    # Calculate streaks
    current_streak = 0
    longest_streak = 0
    current_run = 0
    
    # Convert to date strings for easier comparison
    completion_dates = [log["completed_at"].date() for log in logs]
    completion_dates.sort()
    
    # Calculate habit start date (either creation date or first log)
    habit_start = min(habit["created_at"].date(), completion_dates[0])
    
    # Calculate days since habit started
    days_since_start = (datetime.utcnow().date() - habit_start).days + 1
    
    # Calculate streaks based on frequency
    frequency = habit["frequency"]
    
    if frequency == "daily":
        # For daily habits, we expect completion every day
        current_date = datetime.utcnow().date()
        
        # Check current streak (consecutive days from today backwards)
        i = 0
        while True:
            check_date = current_date - timedelta(days=i)
            if check_date in completion_dates:
                current_streak += 1
                i += 1
            else:
                break
        
        # Calculate longest streak
        prev_date = None
        for date in completion_dates:
            if prev_date is None or (date - prev_date).days == 1:
                current_run += 1
            else:
                current_run = 1
            
            longest_streak = max(longest_streak, current_run)
            prev_date = date
        
        # Calculate completion rate (completions / days since start)
        completion_rate = (total_completions / days_since_start) * 100
        
    elif frequency == "weekly":
        # For weekly habits, we expect completion once per week
        # Simplified approach: check if there's at least one completion in each week
        weeks = {}
        for date in completion_dates:
            year, week, _ = date.isocalendar()
            weeks[(year, week)] = True
        
        total_weeks = (days_since_start // 7) + 1
        completion_rate = (len(weeks) / total_weeks) * 100
        
        # Streaks for weekly are consecutive weeks
        # (simplified implementation - just using number of weeks with logs)
        longest_streak = len(weeks)
        current_streak = longest_streak  # Simplified
        
    else:  # custom frequency
        # For custom frequency, use simplified calculations
        completion_rate = 100.0  # Assuming meeting goals
        longest_streak = total_completions
        current_streak = total_completions
    
    return HabitStats(
        habit_id=habit_id,
        title=habit["title"],
        total_completions=total_completions,
        current_streak=current_streak,
        longest_streak=longest_streak,
        completion_rate=min(100.0, completion_rate)  # Cap at 100%
    )

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
