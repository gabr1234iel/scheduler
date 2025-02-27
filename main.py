#!/usr/bin/env python3
# main.py - Command-line Scheduler Bot

import os
import sys
import pickle
import datetime
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Import our modules
from calendar_integration import CalendarManager
from scheduler_algorithm import SchedulerAlgorithm

# Constants
SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = 'token.pickle'
CREDENTIALS_PATH = 'config/credentials.json'

class SchedulerApp:
    def __init__(self):
        self.service = None
        self.calendar_manager = None
        self.scheduler = None
        self.current_params = {}
    
    def authenticate(self):
        """Authenticate with Google Calendar API"""
        credentials = None
        
        # Check if we have token.pickle file with valid credentials
        if os.path.exists(TOKEN_PATH):
            with open(TOKEN_PATH, 'rb') as token:
                credentials = pickle.load(token)
        
        # If there are no valid credentials, let the user log in
        if not credentials or not credentials.valid:
            if credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
            else:
                # Check if credentials file exists
                if not os.path.exists(CREDENTIALS_PATH):
                    print("Error: credentials.json file not found.")
                    print("Please download it from Google Cloud Console and save as config/credentials.json")
                    print("See: https://developers.google.com/calendar/api/quickstart/python")
                    sys.exit(1)
                
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
                credentials = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(TOKEN_PATH, 'wb') as token:
                pickle.dump(credentials, token)
        
        # Build the service
        self.service = build('calendar', 'v3', credentials=credentials)
        self.calendar_manager = CalendarManager(self.service)
        self.scheduler = SchedulerAlgorithm(self.calendar_manager)
        
        print("Authentication successful!")
        return True
    
    def main_menu(self):
        """Display and handle the main menu"""
        while True:
            print("\n===== Scheduler Bot =====")
            print("1. Create event")
            print("2. View scheduled events")
            print("3. Delete event")
            print("4. Exit")
            
            choice = input("\nEnter your choice (1-4): ")
            
            if choice == '1':
                self.handle_event_creation()
            elif choice == '2':
                self.view_events()
            elif choice == '3':
                self.delete_event()
            elif choice == '4':
                print("Goodbye!")
                break
            else:
                print("Invalid choice. Please try again.")
    
    def handle_event_creation(self):
        """Handle the event creation flow"""
        print("\n=== Event Creation ===")
        
        # Reset parameters
        self.current_params = {}
        
        # Check if collaborative
        collab = input("Is this a collaborative event requiring other participants? (yes/no): ").lower()
        is_collaborative = collab.startswith('y')
        self.current_params['collaborative'] = is_collaborative
        
        # Common parameters
        self.current_params['title'] = input("Event title: ")
        
        try:
            self.current_params['duration'] = int(input("Event duration (in minutes): "))
            self.current_params['priority'] = int(input("Event priority (1-5, with 5 being highest): "))
        except ValueError:
            print("Duration and priority must be numbers. Using defaults (60 min, priority 3).")
            self.current_params['duration'] = 60
            self.current_params['priority'] = 3
        
        self.current_params['time_preference'] = input(
            "Preferred time of day? (morning/afternoon/evening/no preference): "
        ).lower()
        if self.current_params['time_preference'] not in ['morning', 'afternoon', 'evening', 'no preference']:
            print("Invalid preference. Using 'no preference'.")
            self.current_params['time_preference'] = 'no preference'
        
        # Date range
        while True:
            date_range = input(
                "When does this need to happen? (YYYY-MM-DD to YYYY-MM-DD or 'within a week'): "
            )
            try:
                start_time, end_time = self._parse_date_range(date_range)
                break
            except ValueError:
                print("Invalid date format. Please try again.")
        
        self.current_params['date_range'] = (start_time, end_time)
        
        # Collaborative specific parameters
        if is_collaborative:
            participants = input("Please name all required participants (comma separated emails): ")
            self.current_params['participants'] = [p.strip() for p in participants.split(',')]
            
            # Find slots for collaborative event
            print("\nFinding available slots for collaborative event...")
            try:
                available_slots = self.scheduler.find_collaborative_slot(
                    participants=self.current_params['participants'],
                    duration=self.current_params['duration'],
                    priority=self.current_params['priority'],
                    preferred_time=self.current_params['time_preference'],
                    date_range=self.current_params['date_range']
                )
            except Exception as e:
                print(f"Error finding available slots: {e}")
                import traceback
                traceback.print_exc()
                print("\nCouldn't find available slots. Please try again with different parameters.")
                return
        else:
            # Solo event specific parameters
            activity_type = input("What type of activity is this? (work/exercise/personal): ").lower()
            if activity_type not in ['work', 'exercise', 'personal']:
                print("Invalid activity type. Using 'personal'.")
                activity_type = 'personal'
            
            self.current_params['activity_type'] = activity_type
            
            # Buffer time
            buffer = input("Do you need buffer time before or after this activity? (yes/no): ").lower()
            if buffer.startswith('y'):
                try:
                    before = int(input("Buffer time before (in minutes): "))
                    after = int(input("Buffer time after (in minutes): "))
                    self.current_params['buffer_time'] = (before, after)
                except ValueError:
                    print("Buffer times must be numbers. Using no buffer.")
                    self.current_params['buffer_time'] = None
            else:
                self.current_params['buffer_time'] = None
            
            # Find slots for individual event
            print("\nFinding available slots for individual event...")
            try:
                available_slots = self.scheduler.find_individual_slot(
                    activity_type=self.current_params['activity_type'],
                    duration=self.current_params['duration'],
                    priority=self.current_params['priority'],
                    preferred_time=self.current_params['time_preference'],
                    date_range=self.current_params['date_range'],
                    buffer_time=self.current_params['buffer_time']
                )
            except Exception as e:
                print(f"Error finding available slots: {e}")
                import traceback
                traceback.print_exc()
                print("\nCouldn't find available slots. Please try again with different parameters.")
                return
        
        # Display available slots
        if not available_slots:
            print("No available slots found based on your criteria.")
            return
        
        print("\nTop available slots:")
        max_slots = min(5, len(available_slots))
        for i, (start, end) in enumerate(available_slots[:max_slots], 1):
            local_start = start.replace(tzinfo=datetime.timezone.utc).astimezone()
            local_end = end.replace(tzinfo=datetime.timezone.utc).astimezone()
            print(f"{i}. {local_start.strftime('%a, %b %d, %Y %I:%M %p')} - {local_end.strftime('%I:%M %p')}")
        
        # Get user selection
        while True:
            try:
                choice = int(input("\nSelect a slot (number) or 0 to cancel: "))
                if choice == 0:
                    print("Event creation canceled.")
                    return
                if 1 <= choice <= max_slots:
                    break
                print(f"Please enter a number between 1 and {max_slots}.")
            except ValueError:
                print("Please enter a valid number.")
        
        selected_slot = available_slots[choice-1]
        
        # Create the event
        self._create_event(selected_slot)
    
    def _create_event(self, slot):
        """Create an event with the selected slot"""
        start_time, end_time = slot
        start_time_with_zone = start_time.replace(tzinfo=datetime.timezone.utc)
        
        # Calculate real end time (start + duration)
        real_end_time = start_time_with_zone + datetime.timedelta(minutes=self.current_params['duration'])
        
        title = self.current_params['title']
        
        # Add buffer time for individual events if needed
        if not self.current_params['collaborative'] and self.current_params.get('buffer_time'):
            before, after = self.current_params['buffer_time']
            if before > 0:
                # Create buffer event before
                buffer_start = start_time_with_zone - datetime.timedelta(minutes=before)
                self.calendar_manager.create_event(
                    title=f"Buffer before: {title}",
                    start_time=buffer_start,
                    end_time=start_time_with_zone,
                    description="Buffer time before event"
                )
            
            if after > 0:
                # Create buffer event after
                buffer_end = real_end_time + datetime.timedelta(minutes=after)
                self.calendar_manager.create_event(
                    title=f"Buffer after: {title}",
                    start_time=real_end_time,
                    end_time=buffer_end,
                    description="Buffer time after event"
                )
        
        # Create the main event
        description = f"Priority: {self.current_params['priority']}"
        if not self.current_params['collaborative']:
            description += f"\nActivity type: {self.current_params['activity_type']}"
        
        attendees = self.current_params.get('participants', []) if self.current_params['collaborative'] else None
        
        event = self.calendar_manager.create_event(
            title=title,
            start_time=start_time_with_zone,
            end_time=real_end_time,
            description=description,
            attendees=attendees
        )
        
        print(f"\nEvent created successfully! View it at: {event.get('htmlLink')}")
    
    def view_events(self):
        """View upcoming events"""
        print("\n=== Upcoming Events ===")
        
        # Get events for the next 30 days
        now = datetime.datetime.utcnow()
        thirty_days = now + datetime.timedelta(days=30)
        
        events = self.calendar_manager.get_upcoming_events(
            max_results=10,
            time_min=now
        )
        
        if not events:
            print("No upcoming events found.")
            return
        
        for i, event in enumerate(events, 1):
            start = event['start'].get('dateTime', event['start'].get('date'))
            if 'dateTime' in event['start']:
                start_dt = datetime.datetime.fromisoformat(start.replace('Z', '+00:00'))
                local_start = start_dt.astimezone()
                start_str = local_start.strftime('%a, %b %d, %Y %I:%M %p')
            else:
                start_str = start
            
            print(f"{i}. {start_str} - {event['summary']}")
    
    def delete_event(self):
        """Delete an event"""
        print("\n=== Delete Event ===")
        
        # Get upcoming events
        events = self.calendar_manager.get_upcoming_events(max_results=10)
        
        if not events:
            print("No upcoming events found.")
            return
        
        print("Upcoming events:")
        for i, event in enumerate(events, 1):
            start = event['start'].get('dateTime', event['start'].get('date'))
            if 'dateTime' in event['start']:
                start_dt = datetime.datetime.fromisoformat(start.replace('Z', '+00:00'))
                local_start = start_dt.astimezone()
                start_str = local_start.strftime('%a, %b %d, %Y %I:%M %p')
            else:
                start_str = start
            
            print(f"{i}. {start_str} - {event['summary']}")
        
        # Get user selection
        while True:
            try:
                choice = int(input("\nSelect an event to delete (number) or 0 to cancel: "))
                if choice == 0:
                    return
                if 1 <= choice <= len(events):
                    break
                print(f"Please enter a number between 1 and {len(events)}.")
            except ValueError:
                print("Please enter a valid number.")
        
        event = events[choice-1]
        
        # Confirm deletion
        confirm = input(f"Delete '{event['summary']}'? (yes/no): ").lower()
        if not confirm.startswith('y'):
            print("Deletion cancelled.")
            return
        
        # Delete the event
        self.calendar_manager.delete_event(event['id'])
        print("Event deleted successfully.")
    
    def _parse_date_range(self, date_range):
        """Parse date range string into datetime objects"""
        if date_range.lower() == 'within a week':
            start_time = datetime.datetime.utcnow()
            end_time = start_time + datetime.timedelta(days=7)
            return start_time, end_time
        
        try:
            dates = date_range.split(' to ')
            if len(dates) == 2:
                start_date = datetime.datetime.strptime(dates[0], '%Y-%m-%d')
                end_date = datetime.datetime.strptime(dates[1], '%Y-%m-%d')
                # Set end date to end of day
                end_date = end_date.replace(hour=23, minute=59, second=59)
                return start_date, end_date
        except ValueError:
            pass
        
        raise ValueError("Invalid date format. Use 'YYYY-MM-DD to YYYY-MM-DD' or 'within a week'")
    
    def run(self):
        """Run the application"""
        print("Welcome to the Scheduler Bot!")
        
        # Create config directory if it doesn't exist
        Path("config").mkdir(exist_ok=True)
        
        # Check if credentials file exists
        if not os.path.exists(CREDENTIALS_PATH):
            print("\nBefore we begin, you need to set up Google Calendar API credentials:")
            print("1. Go to https://console.cloud.google.com/")
            print("2. Create a new project or select an existing one")
            print("3. Enable the Google Calendar API")
            print("4. Create OAuth 2.0 Client ID credentials (Desktop application)")
            print("5. Download the JSON file and save it as 'config/credentials.json'")
            
            proceed = input("\nHave you done this and saved the credentials file? (yes/no): ")
            if not proceed.lower().startswith('y'):
                print("Please set up the credentials and try again.")
                return
        
        # Authenticate
        if not self.authenticate():
            return
        
        # Run the main menu
        self.main_menu()

if __name__ == "__main__":
    app = SchedulerApp()
    app.run()