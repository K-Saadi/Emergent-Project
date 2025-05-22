import requests
import sys
import time
from datetime import datetime, timedelta
import uuid

class CountdownHabitTester:
    def __init__(self, base_url="https://2feaf4e5-1fca-4b57-b2b2-564243b58061.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            "categories": [],
            "countdowns": [],
            "habits": [],
            "habit_logs": []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        return success, response.json()
                    except:
                        return success, {}
                return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    # Category Tests
    def test_create_category(self, name, color):
        """Create a category"""
        success, response = self.run_test(
            "Create Category",
            "POST",
            "categories",
            200,
            data={"name": name, "color": color}
        )
        if success and 'id' in response:
            self.created_resources["categories"].append(response["id"])
            return response
        return None

    def test_get_categories(self):
        """Get all categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        return response if success else []

    def test_get_category(self, category_id):
        """Get a category by ID"""
        success, response = self.run_test(
            "Get Category",
            "GET",
            f"categories/{category_id}",
            200
        )
        return response if success else None

    def test_delete_category(self, category_id):
        """Delete a category"""
        success, _ = self.run_test(
            "Delete Category",
            "DELETE",
            f"categories/{category_id}",
            200
        )
        if success:
            self.created_resources["categories"].remove(category_id)
        return success

    # Countdown Tests
    def test_create_countdown(self, title, description, target_date, notify_before=None, is_timer=False):
        """Create a countdown"""
        data = {
            "title": title,
            "description": description,
            "target_date": target_date.isoformat(),
            "is_timer": is_timer
        }
        if notify_before:
            data["notify_before"] = notify_before
            
        success, response = self.run_test(
            "Create Countdown",
            "POST",
            "countdowns",
            200,
            data=data
        )
        if success and 'id' in response:
            self.created_resources["countdowns"].append(response["id"])
            return response
        return None

    def test_get_countdowns(self):
        """Get all countdowns"""
        success, response = self.run_test(
            "Get Countdowns",
            "GET",
            "countdowns",
            200
        )
        return response if success else []

    def test_get_countdown(self, countdown_id):
        """Get a countdown by ID"""
        success, response = self.run_test(
            "Get Countdown",
            "GET",
            f"countdowns/{countdown_id}",
            200
        )
        return response if success else None

    def test_update_countdown(self, countdown_id, title, description, target_date, notify_before=None, is_timer=False):
        """Update a countdown"""
        data = {
            "title": title,
            "description": description,
            "target_date": target_date.isoformat(),
            "is_timer": is_timer
        }
        if notify_before:
            data["notify_before"] = notify_before
            
        success, response = self.run_test(
            "Update Countdown",
            "PUT",
            f"countdowns/{countdown_id}",
            200,
            data=data
        )
        return response if success else None

    def test_delete_countdown(self, countdown_id):
        """Delete a countdown"""
        success, _ = self.run_test(
            "Delete Countdown",
            "DELETE",
            f"countdowns/{countdown_id}",
            200
        )
        if success:
            self.created_resources["countdowns"].remove(countdown_id)
        return success

    # Habit Tests
    def test_create_habit(self, title, description, frequency, custom_days=None, category_id=None):
        """Create a habit"""
        data = {
            "title": title,
            "description": description,
            "frequency": frequency
        }
        if custom_days:
            data["custom_days"] = custom_days
        if category_id:
            data["category_id"] = category_id
            
        success, response = self.run_test(
            "Create Habit",
            "POST",
            "habits",
            200,
            data=data
        )
        if success and 'id' in response:
            self.created_resources["habits"].append(response["id"])
            return response
        return None

    def test_get_habits(self, category_id=None):
        """Get all habits"""
        endpoint = "habits"
        if category_id:
            endpoint += f"?category_id={category_id}"
            
        success, response = self.run_test(
            "Get Habits",
            "GET",
            endpoint,
            200
        )
        return response if success else []

    def test_get_habit(self, habit_id):
        """Get a habit by ID"""
        success, response = self.run_test(
            "Get Habit",
            "GET",
            f"habits/{habit_id}",
            200
        )
        return response if success else None

    def test_update_habit(self, habit_id, title, description, frequency, custom_days=None, category_id=None):
        """Update a habit"""
        data = {
            "title": title,
            "description": description,
            "frequency": frequency
        }
        if custom_days:
            data["custom_days"] = custom_days
        if category_id:
            data["category_id"] = category_id
            
        success, response = self.run_test(
            "Update Habit",
            "PUT",
            f"habits/{habit_id}",
            200,
            data=data
        )
        return response if success else None

    def test_delete_habit(self, habit_id):
        """Delete a habit"""
        success, _ = self.run_test(
            "Delete Habit",
            "DELETE",
            f"habits/{habit_id}",
            200
        )
        if success:
            self.created_resources["habits"].remove(habit_id)
        return success

    # Habit Log Tests
    def test_log_habit(self, habit_id, date=None):
        """Log a habit completion"""
        data = {}
        if date:
            data["date"] = date.isoformat()
            
        success, response = self.run_test(
            "Log Habit Completion",
            "POST",
            f"habits/{habit_id}/log",
            200,
            data=data
        )
        if success and 'id' in response:
            self.created_resources["habit_logs"].append((habit_id, response["id"]))
            return response
        return None

    def test_get_habit_logs(self, habit_id, start_date=None, end_date=None):
        """Get habit logs"""
        endpoint = f"habits/{habit_id}/logs"
        params = []
        
        if start_date:
            params.append(f"start_date={start_date.isoformat()}")
        if end_date:
            params.append(f"end_date={end_date.isoformat()}")
            
        if params:
            endpoint += "?" + "&".join(params)
            
        success, response = self.run_test(
            "Get Habit Logs",
            "GET",
            endpoint,
            200
        )
        return response if success else []

    def test_delete_habit_log(self, habit_id, log_id):
        """Delete a habit log"""
        success, _ = self.run_test(
            "Delete Habit Log",
            "DELETE",
            f"habits/{habit_id}/logs/{log_id}",
            200
        )
        if success:
            self.created_resources["habit_logs"].remove((habit_id, log_id))
        return success

    # Stats Tests
    def test_get_habit_stats(self, habit_id):
        """Get habit statistics"""
        success, response = self.run_test(
            "Get Habit Stats",
            "GET",
            f"habits/{habit_id}/stats",
            200
        )
        return response if success else None

    # Cleanup
    def cleanup(self):
        """Clean up created resources"""
        print("\n🧹 Cleaning up resources...")
        
        # Delete habit logs
        for habit_id, log_id in self.created_resources["habit_logs"]:
            self.test_delete_habit_log(habit_id, log_id)
            
        # Delete habits
        for habit_id in self.created_resources["habits"]:
            self.test_delete_habit(habit_id)
            
        # Delete countdowns
        for countdown_id in self.created_resources["countdowns"]:
            self.test_delete_countdown(countdown_id)
            
        # Delete categories
        for category_id in self.created_resources["categories"]:
            self.test_delete_category(category_id)

def main():
    # Setup
    tester = CountdownHabitTester()
    test_prefix = f"test_{int(time.time())}"
    
    try:
        print("🚀 Starting API tests for Countdown & Habit Tracker")
        
        # Test Categories
        print("\n📋 Testing Categories API...")
        category = tester.test_create_category(f"{test_prefix}_Work", "4287f5")
        if not category:
            print("❌ Category creation failed, stopping category tests")
        else:
            categories = tester.test_get_categories()
            if not categories:
                print("❌ Failed to retrieve categories")
                
            category_detail = tester.test_get_category(category["id"])
            if not category_detail:
                print("❌ Failed to retrieve category details")
        
        # Test Countdowns
        print("\n⏱️ Testing Countdowns API...")
        future_date = datetime.now() + timedelta(days=7)
        countdown = tester.test_create_countdown(
            f"{test_prefix}_Project Deadline",
            "Complete the project before deadline",
            future_date,
            notify_before=30
        )
        if not countdown:
            print("❌ Countdown creation failed, stopping countdown tests")
        else:
            countdowns = tester.test_get_countdowns()
            if not countdowns:
                print("❌ Failed to retrieve countdowns")
                
            countdown_detail = tester.test_get_countdown(countdown["id"])
            if not countdown_detail:
                print("❌ Failed to retrieve countdown details")
                
            updated_future_date = datetime.now() + timedelta(days=10)
            updated_countdown = tester.test_update_countdown(
                countdown["id"],
                f"{test_prefix}_Updated Project Deadline",
                "Updated description",
                updated_future_date,
                notify_before=60
            )
            if not updated_countdown:
                print("❌ Failed to update countdown")
        
        # Test Habits
        print("\n🔄 Testing Habits API...")
        habit = tester.test_create_habit(
            f"{test_prefix}_Daily Exercise",
            "30 minutes of exercise",
            "daily",
            category_id=category["id"] if category else None
        )
        if not habit:
            print("❌ Habit creation failed, stopping habit tests")
        else:
            habits = tester.test_get_habits()
            if not habits:
                print("❌ Failed to retrieve habits")
                
            if category:
                category_habits = tester.test_get_habits(category["id"])
                if not category_habits:
                    print("❌ Failed to retrieve habits by category")
                
            habit_detail = tester.test_get_habit(habit["id"])
            if not habit_detail:
                print("❌ Failed to retrieve habit details")
                
            updated_habit = tester.test_update_habit(
                habit["id"],
                f"{test_prefix}_Updated Exercise",
                "45 minutes of exercise",
                "weekly"
            )
            if not updated_habit:
                print("❌ Failed to update habit")
        
        # Test Habit Logs
        print("\n📝 Testing Habit Logs API...")
        if habit:
            log = tester.test_log_habit(habit["id"])
            if not log:
                print("❌ Habit logging failed, stopping habit log tests")
            else:
                logs = tester.test_get_habit_logs(habit["id"])
                if not logs:
                    print("❌ Failed to retrieve habit logs")
                
                # Test stats after logging
                stats = tester.test_get_habit_stats(habit["id"])
                if not stats:
                    print("❌ Failed to retrieve habit stats")
                else:
                    print(f"📊 Habit Stats: {stats}")
        
        # Print results
        print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        
    finally:
        # Clean up
        tester.cleanup()
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())