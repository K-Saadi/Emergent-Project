import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { format, parseISO, differenceInSeconds, addMinutes } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FiClock, FiCheckSquare, FiPlus, FiTrash2, FiEdit, FiChevronRight, FiX, FiHome, FiCalendar, FiBarChart2, FiMoon, FiSun } from "react-icons/fi";
import axios from "axios";
import "./App.css";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      setDarkMode(savedTheme === 'true');
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Save preference
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// Notification function
const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
};

const sendNotification = (title, body) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body: body,
      icon: "/favicon.ico"
    });
    
    // Play sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log("Audio playback error:", e));
    
    return notification;
  }
};

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = parseISO(dateString);
  return format(date, "MMM dd, yyyy h:mm a");
};

const formatDateShort = (dateString) => {
  if (!dateString) return "";
  const date = parseISO(dateString);
  return format(date, "MMM dd");
};

const calculateTimeRemaining = (targetDate) => {
  const now = new Date();
  const target = new Date(targetDate);
  const diffInSeconds = differenceInSeconds(target, now);
  
  if (diffInSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
  
  const days = Math.floor(diffInSeconds / (24 * 60 * 60));
  const hours = Math.floor((diffInSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((diffInSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(diffInSeconds % 60);
  
  return { days, hours, minutes, seconds, isComplete: false };
};

// Navigation Component
const Navigation = () => {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 px-4 flex justify-around z-10">
      <Link to="/" className={`flex flex-col items-center p-2 ${location.pathname === '/' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <FiHome size={24} />
        <span className="text-xs mt-1">Home</span>
      </Link>
      <Link to="/countdowns" className={`flex flex-col items-center p-2 ${location.pathname.includes('/countdowns') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <FiClock size={24} />
        <span className="text-xs mt-1">Countdowns</span>
      </Link>
      <Link to="/habits" className={`flex flex-col items-center p-2 ${location.pathname.includes('/habits') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <FiCheckSquare size={24} />
        <span className="text-xs mt-1">Habits</span>
      </Link>
      <Link to="/stats" className={`flex flex-col items-center p-2 ${location.pathname.includes('/stats') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <FiBarChart2 size={24} />
        <span className="text-xs mt-1">Stats</span>
      </Link>
      <button 
        onClick={toggleDarkMode}
        className="flex flex-col items-center p-2 text-gray-600 dark:text-gray-400"
      >
        {darkMode ? <FiSun size={24} /> : <FiMoon size={24} />}
        <span className="text-xs mt-1">{darkMode ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  );
};

// Home Page
const Home = () => {
  const [countdowns, setCountdowns] = useState([]);
  const [habits, setHabits] = useState([]);
  const [activeCountdowns, setActiveCountdowns] = useState([]);
  const [todayHabits, setTodayHabits] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch countdowns
        const countdownsResponse = await axios.get(`${API}/countdowns`);
        setCountdowns(countdownsResponse.data);
        
        // Fetch habits
        const habitsResponse = await axios.get(`${API}/habits`);
        setHabits(habitsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    // Filter active countdowns (not expired)
    const now = new Date();
    const active = countdowns
      .filter(countdown => new Date(countdown.target_date) > now)
      .sort((a, b) => new Date(a.target_date) - new Date(b.target_date))
      .slice(0, 3); // Take top 3
    
    setActiveCountdowns(active);
    
    // Filter today's habits
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6 (Sunday-Saturday)
    
    const todaysHabits = habits.filter(habit => {
      if (habit.frequency === "daily") return true;
      if (habit.frequency === "weekly" && dayOfWeek === 1) return true; // Monday
      if (habit.frequency === "custom" && habit.custom_days && habit.custom_days.includes(dayOfWeek)) return true;
      return false;
    }).slice(0, 3); // Take top 3
    
    setTodayHabits(todaysHabits);
  }, [countdowns, habits]);

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <h1 className="text-2xl font-bold text-center my-6">Countdown & Habits Tracker</h1>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Countdowns</h2>
          <Link to="/countdowns" className="text-blue-600 flex items-center">
            View All <FiChevronRight />
          </Link>
        </div>
        
        {activeCountdowns.length > 0 ? (
          <div className="space-y-4">
            {activeCountdowns.map(countdown => {
              const timeRemaining = calculateTimeRemaining(countdown.target_date);
              return (
                <div key={countdown.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 className="font-medium text-lg">{countdown.title}</h3>
                  <p className="text-gray-600 text-sm">{countdown.description}</p>
                  <div className="mt-2 font-mono text-sm">
                    {timeRemaining.days > 0 && `${timeRemaining.days}d `}
                    {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Target: {formatDate(countdown.target_date)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No active countdowns</p>
            <Link to="/countdowns/new" className="text-blue-600 flex items-center justify-center mt-2">
              <FiPlus className="mr-1" /> Add Countdown
            </Link>
          </div>
        )}
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Today's Habits</h2>
          <Link to="/habits" className="text-blue-600 flex items-center">
            View All <FiChevronRight />
          </Link>
        </div>
        
        {todayHabits.length > 0 ? (
          <div className="space-y-4">
            {todayHabits.map(habit => (
              <div key={habit.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <h3 className="font-medium text-lg">{habit.title}</h3>
                <p className="text-gray-600 text-sm">{habit.description}</p>
                <div className="text-xs text-gray-500 mt-2">
                  {habit.frequency === "daily" && "Daily habit"}
                  {habit.frequency === "weekly" && "Weekly habit"}
                  {habit.frequency === "custom" && "Custom schedule"}
                </div>
                <Link to={`/habits/${habit.id}/log`} className="mt-2 inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Log completion
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No habits scheduled for today</p>
            <Link to="/habits/new" className="text-blue-600 flex items-center justify-center mt-2">
              <FiPlus className="mr-1" /> Add Habit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// Countdowns Page
const CountdownsList = () => {
  const [countdowns, setCountdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountdowns = async () => {
      try {
        const response = await axios.get(`${API}/countdowns`);
        setCountdowns(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching countdowns:", error);
        setLoading(false);
      }
    };
    
    fetchCountdowns();
    
    // Request notification permission
    requestNotificationPermission();
  }, []);

  // Refreshes the time remaining every second
  useEffect(() => {
    const timerId = setInterval(() => {
      // Update component to refresh countdown times
      setCountdowns(prevCountdowns => [...prevCountdowns]);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, []);

  const handleDeleteCountdown = async (id) => {
    if (window.confirm("Are you sure you want to delete this countdown?")) {
      try {
        await axios.delete(`${API}/countdowns/${id}`);
        setCountdowns(countdowns.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting countdown:", error);
      }
    }
  };

  // Check for notifications
  useEffect(() => {
    const checkNotifications = () => {
      countdowns.forEach(countdown => {
        if (countdown.notify_before && !countdown.is_completed) {
          const targetDate = new Date(countdown.target_date);
          const notifyTime = addMinutes(targetDate, -countdown.notify_before);
          const now = new Date();
          
          // If it's time to notify (within 1 minute window)
          if (now >= notifyTime && now <= addMinutes(notifyTime, 1)) {
            sendNotification(
              `Countdown Reminder: ${countdown.title}`,
              `Your countdown will complete in ${countdown.notify_before} minutes!`
            );
          }
          
          // If countdown is complete (within 1 minute window)
          if (now >= targetDate && now <= addMinutes(targetDate, 1)) {
            sendNotification(
              `Countdown Complete: ${countdown.title}`,
              `Your countdown "${countdown.title}" is now complete!`
            );
            
            // Mark as completed
            axios.put(`${API}/countdowns/${countdown.id}`, {
              ...countdown,
              is_completed: true
            }).catch(error => console.error("Error updating countdown:", error));
          }
        }
      });
    };
    
    // Check for notifications every 30 seconds
    const intervalId = setInterval(checkNotifications, 30000);
    
    // Check once immediately
    checkNotifications();
    
    return () => clearInterval(intervalId);
  }, [countdowns]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Countdowns</h1>
        <Link to="/countdowns/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
          <FiPlus className="mr-1" /> New
        </Link>
      </div>
      
      {countdowns.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">You haven't created any countdowns yet</p>
          <Link to="/countdowns/new" className="text-blue-600 flex items-center justify-center">
            <FiPlus className="mr-1" /> Add your first countdown
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {countdowns.map(countdown => {
            const timeRemaining = calculateTimeRemaining(countdown.target_date);
            const isExpired = timeRemaining.isComplete || countdown.is_completed;
            
            return (
              <div key={countdown.id} 
                className={`bg-white rounded-lg shadow p-4 ${isExpired ? 'border-l-4 border-gray-400' : 'border-l-4 border-blue-500'}`}>
                <div className="flex justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">{countdown.title}</h2>
                    {countdown.description && <p className="text-gray-600 text-sm">{countdown.description}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <Link to={`/countdowns/edit/${countdown.id}`} className="text-blue-600">
                      <FiEdit size={20} />
                    </Link>
                    <button onClick={() => handleDeleteCountdown(countdown.id)} className="text-red-600">
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3">
                  {isExpired ? (
                    <div className="text-gray-500 font-medium">Completed</div>
                  ) : (
                    <div className="font-mono">
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-gray-100 p-2 rounded">
                          <div className="text-2xl font-bold">{timeRemaining.days}</div>
                          <div className="text-xs text-gray-600">days</div>
                        </div>
                        <div className="bg-gray-100 p-2 rounded">
                          <div className="text-2xl font-bold">{timeRemaining.hours}</div>
                          <div className="text-xs text-gray-600">hours</div>
                        </div>
                        <div className="bg-gray-100 p-2 rounded">
                          <div className="text-2xl font-bold">{timeRemaining.minutes}</div>
                          <div className="text-xs text-gray-600">mins</div>
                        </div>
                        <div className="bg-gray-100 p-2 rounded">
                          <div className="text-2xl font-bold">{timeRemaining.seconds}</div>
                          <div className="text-xs text-gray-600">secs</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Target: {formatDate(countdown.target_date)}
                  {countdown.notify_before && (
                    <span className="ml-2">(Notify {countdown.notify_before} mins before)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Create/Edit Countdown
const CountdownForm = () => {
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/');
  const countdownId = isEditMode ? location.pathname.split('/edit/')[1] : null;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_date: new Date(),
    notify_before: 30,
    is_timer: false
  });
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [timerHours, setTimerHours] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(0);

  useEffect(() => {
    const fetchCountdown = async () => {
      if (isEditMode && countdownId) {
        try {
          const response = await axios.get(`${API}/countdowns/${countdownId}`);
          const countdown = response.data;
          
          setFormData({
            title: countdown.title || '',
            description: countdown.description || '',
            target_date: new Date(countdown.target_date),
            notify_before: countdown.notify_before || 30,
            is_timer: countdown.is_timer
          });
          
          setLoading(false);
        } catch (error) {
          console.error("Error fetching countdown:", error);
          setError("Failed to load countdown data");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchCountdown();
  }, [isEditMode, countdownId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, target_date: date }));
  };

  const handleSwitchChange = () => {
    setFormData(prev => ({ ...prev, is_timer: !prev.is_timer }));
  };

  const calculateTimerDate = () => {
    const now = new Date();
    return new Date(now.getTime() + (timerHours * 60 * 60 * 1000) + (timerMinutes * 60 * 1000));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData
      };
      
      // If timer mode, calculate target date from hours/minutes
      if (formData.is_timer) {
        payload.target_date = calculateTimerDate();
      }
      
      if (isEditMode) {
        await axios.put(`${API}/countdowns/${countdownId}`, payload);
      } else {
        await axios.post(`${API}/countdowns`, payload);
      }
      
      // Redirect to countdowns list
      window.location.href = '/countdowns';
    } catch (error) {
      console.error("Error saving countdown:", error);
      setError("Failed to save countdown");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex items-center mb-6">
        <Link to="/countdowns" className="mr-2">
          <FiX size={24} />
        </Link>
        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Countdown' : 'New Countdown'}</h1>
      </div>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="3"
          ></textarea>
        </div>
        
        <div className="flex items-center space-x-2 py-2">
          <span className={`px-3 py-1 rounded-full text-sm ${formData.is_timer ? 'bg-gray-200' : 'bg-blue-100 text-blue-800'}`}>
            Specific Date
          </span>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input 
              type="checkbox" 
              name="is_timer" 
              id="is_timer" 
              checked={formData.is_timer}
              onChange={handleSwitchChange}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label 
              htmlFor="is_timer" 
              className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
            ></label>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${formData.is_timer ? 'bg-blue-100 text-blue-800' : 'bg-gray-200'}`}>
            Timer
          </span>
        </div>
        
        {formData.is_timer ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                id="hours"
                name="hours"
                value={timerHours}
                onChange={(e) => setTimerHours(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="minutes" className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
              <input
                type="number"
                id="minutes"
                name="minutes"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                min="0"
                max="59"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="target_date" className="block text-sm font-medium text-gray-700 mb-1">Target Date & Time</label>
            <DatePicker
              selected={formData.target_date}
              onChange={handleDateChange}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="notify_before" className="block text-sm font-medium text-gray-700 mb-1">
            Notify Before (minutes)
          </label>
          <select
            id="notify_before"
            name="notify_before"
            value={formData.notify_before || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">No notification</option>
            <option value="5">5 minutes before</option>
            <option value="10">10 minutes before</option>
            <option value="15">15 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="120">2 hours before</option>
            <option value="1440">1 day before</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          {isEditMode ? 'Update Countdown' : 'Create Countdown'}
        </button>
      </form>
    </div>
  );
};

// Habits Section
const HabitsList = () => {
  const [habits, setHabits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [habitLogs, setHabitLogs] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await axios.get(`${API}/categories`);
        setCategories(categoriesResponse.data);
        
        // Fetch habits
        const habitsResponse = await axios.get(`${API}/habits`);
        setHabits(habitsResponse.data);
        
        // Fetch today's logs for each habit
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        
        const logsMap = {};
        
        for (const habit of habitsResponse.data) {
          try {
            const logsResponse = await axios.get(
              `${API}/habits/${habit.id}/logs?start_date=${startOfDay}&end_date=${endOfDay}`
            );
            logsMap[habit.id] = logsResponse.data.length > 0;
          } catch (error) {
            console.error(`Error fetching logs for habit ${habit.id}:`, error);
            logsMap[habit.id] = false;
          }
        }
        
        setHabitLogs(logsMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const getCategoryColor = (categoryId) => {
    if (!categoryId) return "gray-500";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : "gray-500";
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const handleDeleteHabit = async (id) => {
    if (window.confirm("Are you sure you want to delete this habit?")) {
      try {
        await axios.delete(`${API}/habits/${id}`);
        setHabits(habits.filter(h => h.id !== id));
      } catch (error) {
        console.error("Error deleting habit:", error);
      }
    }
  };

  const handleLogCompletion = async (habitId) => {
    try {
      await axios.post(`${API}/habits/${habitId}/log`);
      setHabitLogs(prev => ({ ...prev, [habitId]: true }));
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert("You've already logged this habit today!");
      } else {
        console.error("Error logging habit completion:", error);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Group habits by category
  const habitsByCategory = {};
  habits.forEach(habit => {
    const categoryId = habit.category_id || "uncategorized";
    if (!habitsByCategory[categoryId]) {
      habitsByCategory[categoryId] = [];
    }
    habitsByCategory[categoryId].push(habit);
  });

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Habits</h1>
        <div className="flex space-x-2">
          <Link to="/categories" className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm">
            Categories
          </Link>
          <Link to="/habits/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center">
            <FiPlus className="mr-1" /> New
          </Link>
        </div>
      </div>
      
      {habits.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">You haven't created any habits yet</p>
          <Link to="/habits/new" className="text-blue-600 flex items-center justify-center">
            <FiPlus className="mr-1" /> Add your first habit
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(habitsByCategory).map(categoryId => (
            <div key={categoryId} className="mb-4">
              <h2 className="text-lg font-semibold mb-2 px-1">
                {getCategoryName(categoryId === "uncategorized" ? null : categoryId)}
              </h2>
              <div className="space-y-3">
                {habitsByCategory[categoryId].map(habit => (
                  <div key={habit.id} className="bg-white rounded-lg shadow p-4 border-l-4"
                    style={{ borderColor: `#${getCategoryColor(habit.category_id)}` }}>
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{habit.title}</h3>
                        {habit.description && <p className="text-gray-600 text-sm">{habit.description}</p>}
                        <div className="text-xs text-gray-500 mt-1">
                          {habit.frequency === "daily" && "Daily"}
                          {habit.frequency === "weekly" && "Weekly"}
                          {habit.frequency === "custom" && "Custom schedule"}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link to={`/habits/edit/${habit.id}`} className="text-blue-600">
                          <FiEdit size={20} />
                        </Link>
                        <button onClick={() => handleDeleteHabit(habit.id)} className="text-red-600">
                          <FiTrash2 size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <Link to={`/habits/${habit.id}/stats`} className="text-blue-600 text-sm flex items-center">
                        <FiBarChart2 className="mr-1" /> View Stats
                      </Link>
                      
                      {habitLogs[habit.id] ? (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          Completed Today ✓
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleLogCompletion(habit.id)} 
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Create/Edit Habit
const HabitForm = () => {
  const location = useLocation();
  const isEditMode = location.pathname.includes('/edit/');
  const habitId = isEditMode ? location.pathname.split('/edit/')[1] : null;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    custom_days: [],
    category_id: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await axios.get(`${API}/categories`);
        setCategories(categoriesResponse.data);
        
        // Fetch habit data if in edit mode
        if (isEditMode && habitId) {
          const habitResponse = await axios.get(`${API}/habits/${habitId}`);
          const habit = habitResponse.data;
          
          setFormData({
            title: habit.title || '',
            description: habit.description || '',
            frequency: habit.frequency || 'daily',
            custom_days: habit.custom_days || [],
            category_id: habit.category_id || ''
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isEditMode, habitId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomDayToggle = (day) => {
    const currentDays = [...formData.custom_days];
    const index = currentDays.indexOf(day);
    
    if (index > -1) {
      currentDays.splice(index, 1);
    } else {
      currentDays.push(day);
    }
    
    setFormData(prev => ({ ...prev, custom_days: currentDays }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = { ...formData };
      
      // Only include custom_days if frequency is custom
      if (payload.frequency !== 'custom') {
        delete payload.custom_days;
      }
      
      if (isEditMode) {
        await axios.put(`${API}/habits/${habitId}`, payload);
      } else {
        await axios.post(`${API}/habits`, payload);
      }
      
      // Redirect to habits list
      window.location.href = '/habits';
    } catch (error) {
      console.error("Error saving habit:", error);
      setError("Failed to save habit");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex items-center mb-6">
        <Link to="/habits" className="mr-2">
          <FiX size={24} />
        </Link>
        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Habit' : 'New Habit'}</h1>
      </div>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows="3"
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Uncategorized</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <div className="mt-1 text-sm text-gray-500">
            <Link to="/categories" className="text-blue-600">Manage categories</Link>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="daily"
                checked={formData.frequency === 'daily'}
                onChange={handleChange}
                className="mr-2"
              />
              Daily
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="weekly"
                checked={formData.frequency === 'weekly'}
                onChange={handleChange}
                className="mr-2"
              />
              Weekly
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="frequency"
                value="custom"
                checked={formData.frequency === 'custom'}
                onChange={handleChange}
                className="mr-2"
              />
              Custom
            </label>
          </div>
        </div>
        
        {formData.frequency === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Days</label>
            <div className="space-y-2">
              {dayNames.map((day, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.custom_days.includes(index)}
                    onChange={() => handleCustomDayToggle(index)}
                    className="mr-2"
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          {isEditMode ? 'Update Habit' : 'Create Habit'}
        </button>
      </form>
    </div>
  );
};

// Categories Management
const CategoriesList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', color: '4f46e5' });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category? Habits in this category will become uncategorized.")) {
      try {
        await axios.delete(`${API}/categories/${id}`);
        setCategories(categories.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      setError("Category name is required");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/categories`, newCategory);
      setCategories([...categories, response.data]);
      setNewCategory({ name: '', color: '4f46e5' });
      setIsAdding(false);
      setError('');
    } catch (error) {
      console.error("Error creating category:", error);
      setError("Failed to create category");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex items-center mb-6">
        <Link to="/habits" className="mr-2">
          <FiX size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>
      
      {!isAdding ? (
        <button 
          onClick={() => setIsAdding(true)} 
          className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <FiPlus className="mr-1" /> Add Category
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">New Category</h2>
          
          {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newCategory.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center">
                <span className="mr-2 text-gray-700">#</span>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={newCategory.color}
                  onChange={handleInputChange}
                  pattern="[0-9A-Fa-f]{6}"
                  maxLength="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div
                  className="ml-2 w-8 h-8 rounded border border-gray-300"
                  style={{ backgroundColor: `#${newCategory.color}` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Hex color (e.g., 4f46e5 for blue)</div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                type="submit" 
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsAdding(false);
                  setNewCategory({ name: '', color: '4f46e5' });
                  setError('');
                }}
                className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {categories.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">You haven't created any categories yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(category => (
            <div key={category.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div className="flex items-center">
                <div 
                  className="w-6 h-6 rounded mr-3" 
                  style={{ backgroundColor: `#${category.color}` }}
                ></div>
                <span className="font-medium">{category.name}</span>
              </div>
              <button 
                onClick={() => handleDeleteCategory(category.id)} 
                className="text-red-600"
              >
                <FiTrash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Habit Stats Page
const HabitStats = () => {
  const location = useLocation();
  const habitId = location.pathname.split('/habits/')[1].split('/stats')[0];
  
  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch habit details
        const habitResponse = await axios.get(`${API}/habits/${habitId}`);
        setHabit(habitResponse.data);
        
        // Fetch habit stats
        const statsResponse = await axios.get(`${API}/habits/${habitId}/stats`);
        setStats(statsResponse.data);
        
        // Fetch habit logs (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const logsResponse = await axios.get(
          `${API}/habits/${habitId}/logs?start_date=${thirtyDaysAgo.toISOString()}`
        );
        setLogs(logsResponse.data);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching habit data:", error);
        setError("Failed to load habit data");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [habitId]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 pt-4">
        <div className="bg-red-100 text-red-700 p-3 rounded-lg">{error}</div>
        <div className="mt-4">
          <Link to="/habits" className="text-blue-600">← Back to Habits</Link>
        </div>
      </div>
    );
  }

  if (!habit || !stats) {
    return (
      <div className="container mx-auto px-4 pt-4">
        <div className="bg-yellow-100 text-yellow-700 p-3 rounded-lg">Habit not found</div>
        <div className="mt-4">
          <Link to="/habits" className="text-blue-600">← Back to Habits</Link>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const pieData = {
    labels: ['Completed', 'Missed'],
    datasets: [
      {
        data: [stats.total_completions, 100 - stats.completion_rate],
        backgroundColor: ['#4ade80', '#f87171'],
        borderColor: ['#22c55e', '#ef4444'],
        borderWidth: 1,
      },
    ],
  };

  // Group logs by date for the bar chart
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    last7Days.push(date);
  }
  
  const logsByDate = {};
  logs.forEach(log => {
    const date = new Date(log.completed_at).toDateString();
    logsByDate[date] = (logsByDate[date] || 0) + 1;
  });
  
  const barData = {
    labels: last7Days.map(date => format(date, 'EEE')),
    datasets: [
      {
        label: 'Completions',
        data: last7Days.map(date => logsByDate[date.toDateString()] || 0),
        backgroundColor: '#60a5fa',
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <div className="flex items-center mb-6">
        <Link to="/habits" className="mr-2">
          <FiX size={24} />
        </Link>
        <h1 className="text-2xl font-bold">Habit Statistics</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold">{habit.title}</h2>
        {habit.description && <p className="text-gray-600 mt-1">{habit.description}</p>}
        <div className="text-sm text-gray-500 mt-2">
          {habit.frequency === "daily" && "Daily habit"}
          {habit.frequency === "weekly" && "Weekly habit"}
          {habit.frequency === "custom" && "Custom schedule"}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Completion Rate</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{Math.round(stats.completion_rate)}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Current Streak</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{stats.current_streak} {habit.frequency === "daily" ? "days" : "times"}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Best Streak</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{stats.longest_streak} {habit.frequency === "daily" ? "days" : "times"}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4">Completion Rate</h3>
        <div className="w-full h-64 flex justify-center">
          <div className="w-64 h-64">
            <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4">Last 7 Days</h3>
        <div className="w-full h-64">
          <Bar 
            data={barData} 
            options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1
                  }
                }
              }
            }} 
          />
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-4">Recent Logs</h3>
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent logs found</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex justify-between items-center border-b pb-2">
                <div>{formatDate(log.completed_at)}</div>
                <button 
                  onClick={async () => {
                    if (window.confirm("Remove this log?")) {
                      try {
                        await axios.delete(`${API}/habits/${habitId}/logs/${log.id}`);
                        setLogs(logs.filter(l => l.id !== log.id));
                      } catch (error) {
                        console.error("Error deleting log:", error);
                      }
                    }
                  }}
                  className="text-red-600"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Stats Overview Page
const StatsOverview = () => {
  const [habits, setHabits] = useState([]);
  const [habitStats, setHabitStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all habits
        const habitsResponse = await axios.get(`${API}/habits`);
        setHabits(habitsResponse.data);
        
        // Fetch stats for each habit
        const stats = {};
        
        for (const habit of habitsResponse.data) {
          try {
            const statsResponse = await axios.get(`${API}/habits/${habit.id}/stats`);
            stats[habit.id] = statsResponse.data;
          } catch (error) {
            console.error(`Error fetching stats for habit ${habit.id}:`, error);
          }
        }
        
        setHabitStats(stats);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Calculate overall stats
  const calculateOverallStats = () => {
    if (Object.keys(habitStats).length === 0) {
      return {
        averageCompletionRate: 0,
        totalStreaks: 0,
        longestStreak: 0,
      };
    }
    
    let totalCompletionRate = 0;
    let totalStreaks = 0;
    let longestStreak = 0;
    
    Object.values(habitStats).forEach(stat => {
      totalCompletionRate += stat.completion_rate;
      totalStreaks += stat.current_streak;
      longestStreak = Math.max(longestStreak, stat.longest_streak);
    });
    
    return {
      averageCompletionRate: totalCompletionRate / Object.keys(habitStats).length,
      totalStreaks,
      longestStreak,
    };
  };

  const overallStats = calculateOverallStats();

  // Data for the overall pie chart
  const overallPieData = {
    labels: ['Average Completion Rate', 'Incomplete'],
    datasets: [
      {
        data: [overallStats.averageCompletionRate, 100 - overallStats.averageCompletionRate],
        backgroundColor: ['#4ade80', '#f87171'],
        borderColor: ['#22c55e', '#ef4444'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 pb-20 pt-4">
      <h1 className="text-2xl font-bold text-center my-6">Habits Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Average Completion</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{Math.round(overallStats.averageCompletionRate)}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Total Active Streaks</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{overallStats.totalStreaks}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Longest Streak</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">{overallStats.longestStreak}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-4">Overall Completion Rate</h3>
        <div className="w-full h-64 flex justify-center">
          <div className="w-64 h-64">
            <Pie data={overallPieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-4">Habit Completion Rates</h3>
        {habits.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No habits found</p>
        ) : (
          <div className="space-y-4">
            {habits.map(habit => {
              const stats = habitStats[habit.id] || { completion_rate: 0, current_streak: 0 };
              
              return (
                <div key={habit.id} className="border-b pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{habit.title}</h4>
                    <Link to={`/habits/${habit.id}/stats`} className="text-blue-600 text-sm">
                      Details
                    </Link>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.round(stats.completion_rate)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{Math.round(stats.completion_rate)}% completed</span>
                    <span>Current streak: {stats.current_streak}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <div className="App bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Countdown Routes */}
            <Route path="/countdowns" element={<CountdownsList />} />
            <Route path="/countdowns/new" element={<CountdownForm />} />
            <Route path="/countdowns/edit/:id" element={<CountdownForm />} />
            
            {/* Habit Routes */}
            <Route path="/habits" element={<HabitsList />} />
            <Route path="/habits/new" element={<HabitForm />} />
            <Route path="/habits/edit/:id" element={<HabitForm />} />
            <Route path="/habits/:id/stats" element={<HabitStats />} />
            
            {/* Categories */}
            <Route path="/categories" element={<CategoriesList />} />
            
            {/* Stats */}
            <Route path="/stats" element={<StatsOverview />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          <Navigation />
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
