#!/usr/bin/env python3
# cli_scheduler.py

import os
import sys
import json
import pickle
import datetime
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# Constants
SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_PATH = 'token.pickle'
CREDENTIALS_PATH = 'config/credentials.json'

class SchedulerBot:
    def __init__(self):
        self.service = None
        self.credentials = None
        self.current_event_params = {}

    def authenticate(self):
        """Authenticate the user with Google Calendar API"""
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
                    print("Error: credentials.json file not found. Please download it from Google Cloud Console.")
                    print("See: https://developers.google.com/calendar/api/quickstart/python")
                    sys.exit(1)
                
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
                credentials = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(TOKEN_PATH, 'wb') as token:
                pickle.dump(credentials, token)
        
        self.credentials = credentials
        self.service = build('calendar', 'v3', credentials=credentials)
        print("Authentication successful!")
        return True

    def display_menu(self):
        """Display the main menu options"""
        print("\n===== Scheduler Bot =====")
        print("1. Create event")
        print("2. Delete event")
        print("3. View scheduled events")
        print("4. Exit")
        choice = input("Enter your choice (1-4): ")
        return choice

    def collect_event_parameters(self):
        """Collect parameters for event creation"""
        self.current_event_params = {}
        
        print("\n== Event Creation ==")
        
        # Check if collaborative or solo event
        collab = input("Is this a collaborative event requiring other participants? (yes/no): ").lower().strip()
        self.current_event_params['collaborative'] = collab.startswith('y')
        
        # Collect common parameters
        self.current_event_params['title'] = input("Event title: ")
        self.current_event_params['duration'] = int(input("Event duration (in minutes): "))
        self.current_event_params['priority'] = int(input("Event priority (1-5, with 5 being highest): "))
        
        time_pref = input("Preferred time of day? (morning/afternoon/evening/no preference): ").lower().strip()
        self.current_event_params['time_preference'] = time_pref
        
        recurring = input("Is this a recurring event? (yes/no): ").lower().strip()
        self.current_event_params['recurring'] = recurring.startswith('y')
        
        date_range = input("When does this need to happen? (enter date range or 'within a week'): ")
        self.current_event_params['date_range'] = date_range
        
        # Collect parameters specific to collaborative events
        if self.current_event_params['collaborative']:
            participants = input("Please name all required participants (comma separated): ")
            self.current_event_params['participants'] = [p.strip() for p in participants.split(',')]
        else:
            # Solo event specific parameters
            activity_type = input("What type of activity is this? (work/exercise/personal): ")
            self.current_event_params['activity_type'] = activity_type
            
            buffer = input("Do you need buffer time before or after this activity? (yes/no): ").lower().strip()
            if buffer.startswith('y'):
                buffer_time = input("How much buffer time? (format: X before, Y after in minutes): ")
                self.current_event_params['buffer_time'] = buffer_time
        
        return self.current_event_params

    def find_available_slots(self, params):
        """Find available time slots based on parameters"""
        print("\nFinding available time slots...")
        
        # Parse date range
        start_time, end_time = self._parse_date_range(params['date_range'])
        
        # Get busy periods from calendar
        calendar_id = 'primary'
        events_result = self.service.freebusy().query(
            body={
                "timeMin": start_time.isoformat() + 'Z',
                "timeMax": end_time.isoformat() + 'Z',
                "items": [{"id": calendar_id}]
            }
        ).execute()
        
        busy_periods = events_result['calendars'][calendar_id]['busy']
        
        # Create list of busy time ranges
        busy_ranges = []
        for period in busy_periods:
            start = datetime.datetime.fromisoformat(period['start'].replace('Z', '+00:00'))
            end = datetime.datetime.fromisoformat(period['end'].replace('Z', '+00:00'))
            busy_ranges.append((start, end))
        
        # Find free slots
        available_slots = self._find_free_slots(start_time, end_time, busy_ranges, params['duration'])
        
        # Filter by time preference
        filtered_slots = self._filter_by_time_preference(available_slots, params['time_preference'])
        
        return filtered_slots

    def _parse_date_range(self, date_range):
        """Parse the date range string into start and end datetime objects"""
        now = datetime.datetime.utcnow()
        
        if date_range.lower() == 'within a week':
            start_time = now
            end_time = now + datetime.timedelta(days=7)
        else:
            # Handle specific date range format
            # This is a simplified version - in practice, you'd want more robust parsing
            try:
                dates = date_range.split(' to ')
                if len(dates) == 2:
                    start_date = datetime.datetime.strptime(dates[0], '%Y-%m-%d')
                    end_date = datetime.datetime.strptime(dates[1], '%Y-%m-%d')
                    start_time = start_date
                    end_time = end_date.replace(hour=23, minute=59, second=59)
                else:
                    # Default to a week if parsing fails
                    start_time = now
                    end_time = now + datetime.timedelta(days=7)
            except ValueError:
                print("Date format not recognized, using one week range.")
                start_time = now
                end_time = now + datetime.timedelta(days=7)
        
        return start_time, end_time

    def _find_free_slots(self, start_time, end_time, busy_ranges, duration_minutes):
        """Find free time slots between busy periods"""
        duration = datetime.timedelta(minutes=duration_minutes)
        free_slots = []
        
        # Sort busy ranges
        busy_ranges.sort(key=lambda x: x[0])
        
        # Start with the beginning of the range
        current_time = start_time
        
        for busy_start, busy_end in busy_ranges:
            # Check if there's enough time before this busy period
            if busy_start - current_time >= duration:
                free_slots.append((current_time, busy_start))
            
            # Move to the end of this busy period
            current_time = busy_end
        
        # Check if there's time after the last busy period
        if end_time - current_time >= duration:
            free_slots.append((current_time, end_time))
        
        return free_slots

    def _filter_by_time_preference(self, slots, time_preference):
        """Filter slots by time preference (morning/afternoon/evening)"""
        filtered_slots = []
        
        for start, end in slots:
            # Adjust for a more realistic approach based on UTC time
            # In a real implementation, you'd want to consider user's timezone
            hour = start.hour
            
            if time_preference == 'morning' and 5 <= hour < 12:
                filtered_slots.append((start, end))
            elif time_preference == 'afternoon' and 12 <= hour < 17:
                filtered_slots.append((start, end))
            elif time_preference == 'evening' and 17 <= hour < 23:
                filtered_slots.append((start, end))
            elif time_preference == 'no preference':
                filtered_slots.append((start, end))
        
        return filtered_slots

    def create_event(self, params, selected_slot):
        """Create an event on Google Calendar"""
        start_time, end_time = selected_slot
        
        event = {
            'summary': params['title'],
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': (start_time + datetime.timedelta(minutes=params['duration'])).isoformat(),
                'timeZone': 'UTC',
            },
            'description': f"Priority: {params['priority']}"
        }
        
        # Add attendees if collaborative
        if params.get('collaborative', False) and 'participants' in params:
            event['attendees'] = [{'email': p} for p in params['participants']]
            event['guestsCanSeeOtherGuests'] = True
        
        # Create the event
        event = self.service.events().insert(calendarId='primary', body=event).execute()
        print(f"Event created: {event.get('htmlLink')}")
        return event

    def list_upcoming_events(self, max_results=10):
        """List upcoming events from the calendar"""
        now = datetime.datetime.utcnow().isoformat() + 'Z'  # 'Z' indicates UTC time
        print('Getting the upcoming events')
        events_result = self.service.events().list(
            calendarId='primary', timeMin=now,
            maxResults=max_results, singleEvents=True,
            orderBy='startTime').execute()
        events = events_result.get('items', [])

        if not events:
            print('No upcoming events found.')
            return

        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            print(f"{start} - {event['summary']}")
        
        return events

    def delete_event(self, event_id):
        """Delete an event from the calendar"""
        self.service.events().delete(calendarId='primary', eventId=event_id).execute()
        print('Event deleted')

    def run(self):
        """Run the main bot loop"""
        if not self.authenticate():
            return
        
        while True:
            choice = self.display_menu()
            
            if choice == '1':  # Create event
                params = self.collect_event_parameters()
                available_slots = self.find_available_slots(params)
                
                if not available_slots:
                    print("No available slots found based on your criteria.")
                    continue
                
                print("\nAvailable slots:")
                for i, (start, end) in enumerate(available_slots[:5], 1):
                    print(f"{i}. {start.strftime('%Y-%m-%d %H:%M')} to {end.strftime('%Y-%m-%d %H:%M')}")
                
                slot_choice = int(input("\nSelect a slot (number): ")) - 1
                if 0 <= slot_choice < len(available_slots):
                    selected_slot = available_slots[slot_choice]
                    self.create_event(params, selected_slot)
            
            elif choice == '2':  # Delete event
                events = self.list_upcoming_events()
                if events:
                    event_num = int(input("\nEnter the number of the event to delete: ")) - 1
                    if 0 <= event_num < len(events):
                        self.delete_event(events[event_num]['id'])
            
            elif choice == '3':  # View scheduled events
                self.list_upcoming_events()
            
            elif choice == '4':  # Exit
                print("Goodbye!")
                break
            
            else:
                print("Invalid choice. Please try again.")

if __name__ == "__main__":
    # Create credentials directory if it doesn't exist
    Path("config").mkdir(exist_ok=True)
    
    # Create and run the bot
    bot = SchedulerBot()
    bot.run()