# calendar_integration.py

import datetime
from typing import List, Tuple, Dict, Any, Optional

class CalendarManager:
    """
    Helper class for working with Google Calendar API
    """
    
    def __init__(self, service):
        """
        Initialize with a Google Calendar service object
        
        Args:
            service: Authenticated Google Calendar API service
        """
        self.service = service
    
    def get_busy_periods(
        self, 
        start_time: datetime.datetime, 
        end_time: datetime.datetime, 
        calendar_ids: List[str] = None
    ) -> Dict[str, List[Tuple[datetime.datetime, datetime.datetime]]]:
        """
        Get busy periods for specified calendars
        
        Args:
            start_time: Start of the time range to check
            end_time: End of the time range to check
            calendar_ids: List of calendar IDs to check (defaults to primary)
            
        Returns:
            Dictionary mapping calendar IDs to lists of (start, end) tuples for busy periods
        """
        if calendar_ids is None:
            calendar_ids = ['primary']
            
        items = [{"id": cal_id} for cal_id in calendar_ids]
        
        body = {
            "timeMin": start_time.isoformat() + 'Z',
            "timeMax": end_time.isoformat() + 'Z',
            "items": items
        }
        
        try:
            # Query the API
            print(f"Querying free/busy for {calendar_ids} from {start_time} to {end_time}")
            response = self.service.freebusy().query(body=body).execute()
            
            # Process the response
            result = {}
            calendars_data = response.get('calendars', {})
            
            for cal_id in calendar_ids:
                cal_data = calendars_data.get(cal_id, {})
                busy_list = cal_data.get('busy', [])
                
                # Convert to datetime tuples
                busy_periods = []
                for period in busy_list:
                    try:
                        start = datetime.datetime.fromisoformat(period['start'].replace('Z', '+00:00'))
                        end = datetime.datetime.fromisoformat(period['end'].replace('Z', '+00:00'))
                        busy_periods.append((start, end))
                    except (KeyError, ValueError) as e:
                        print(f"Error parsing busy period {period}: {e}")
                
                result[cal_id] = busy_periods
                print(f"Calendar {cal_id}: Found {len(busy_periods)} busy periods")
            
            return result
            
        except Exception as e:
            print(f"Error querying calendar availability: {e}")
            # Return empty dict if there's an error
            return {cal_id: [] for cal_id in calendar_ids}
    
    def create_event(
        self, 
        title: str, 
        start_time: datetime.datetime, 
        end_time: datetime.datetime, 
        description: str = "", 
        location: str = "", 
        attendees: List[str] = None, 
        calendar_id: str = 'primary',
        recurrence: List[str] = None
    ) -> Dict[str, Any]:
        """
        Create an event on Google Calendar
        
        Args:
            title: Event title
            start_time: Start time
            end_time: End time
            description: Event description
            location: Event location
            attendees: List of attendee emails
            calendar_id: Calendar ID where to create the event
            recurrence: List of recurrence rules (RRULE)
            
        Returns:
            The created event object
        """
        event = {
            'summary': title,
            'location': location,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC',
            }
        }
        
        if attendees:
            event['attendees'] = [{'email': email} for email in attendees]
        
        if recurrence:
            event['recurrence'] = recurrence
        
        return self.service.events().insert(calendarId=calendar_id, body=event).execute()
    
    def delete_event(self, event_id: str, calendar_id: str = 'primary') -> None:
        """
        Delete an event from Google Calendar
        
        Args:
            event_id: ID of the event to delete
            calendar_id: Calendar ID where the event is
        """
        self.service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
    
    def get_upcoming_events(
        self, 
        max_results: int = 10, 
        calendar_id: str = 'primary',
        time_min: Optional[datetime.datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming events from the calendar
        
        Args:
            max_results: Maximum number of events to return
            calendar_id: Calendar ID to get events from
            time_min: Earliest time to include (defaults to now)
            
        Returns:
            List of event objects
        """
        if time_min is None:
            time_min = datetime.datetime.utcnow()
            
        events_result = self.service.events().list(
            calendarId=calendar_id,
            timeMin=time_min.isoformat() + 'Z',
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        return events_result.get('items', [])
    
    def update_event(
        self, 
        event_id: str, 
        updates: Dict[str, Any], 
        calendar_id: str = 'primary'
    ) -> Dict[str, Any]:
        """
        Update an existing event
        
        Args:
            event_id: ID of the event to update
            updates: Dictionary of fields to update
            calendar_id: Calendar ID where the event is
            
        Returns:
            The updated event object
        """
        # First get the existing event
        event = self.service.events().get(calendarId=calendar_id, eventId=event_id).execute()
        
        # Update the fields
        for key, value in updates.items():
            event[key] = value
        
        # Update the event
        return self.service.events().update(calendarId=calendar_id, eventId=event_id, body=event).execute()