# app/api/events.py
from fastapi import APIRouter, HTTPException, status
from app.models.schemas import EventCreateRequest, EventResponse, EventsListRequest, EventsListResponse, Event
from app.utils.auth import get_calendar_service
import datetime
import os
import sys

# Add parent directory to path to import the existing scheduler code
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import your existing scheduler modules
from calendar_integration import CalendarManager

# Create router
router = APIRouter()

@router.post("/events/create", response_model=EventResponse)
async def create_event(request: EventCreateRequest):
    """
    Create a new event in the user's calendar.
    
    This endpoint integrates with your existing calendar integration code
    to create events in Google Calendar.
    """
    try:
        # Get Google Calendar service
        service = get_calendar_service(request.access_token)
        
        # Initialize calendar manager from your existing code
        calendar_manager = CalendarManager(service)
        
        # Convert string dates to datetime objects
        start_time = datetime.datetime.fromisoformat(request.start_time)
        end_time = datetime.datetime.fromisoformat(request.end_time)
        
        # Prepare attendees if present
        attendees = None
        if request.participants:
            attendees = request.participants
        
        # Create the event using your existing CalendarManager
        event = calendar_manager.create_event(
            title=request.title,
            start_time=start_time,
            end_time=end_time,
            description=request.description,
            location=request.location,
            attendees=attendees
        )
        
        # Return response with event details
        return EventResponse(
            success=True,
            event_id=event.get("id"),
            event_link=event.get("htmlLink"),
            message="Event created successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating event: {str(e)}"
        )

@router.post("/events/list", response_model=EventsListResponse)
async def list_events(request: EventsListRequest):
    """
    List events from the user's calendar.
    
    This endpoint integrates with your existing calendar integration code
    to fetch events from Google Calendar.
    """
    try:
        # Get Google Calendar service
        service = get_calendar_service(request.access_token)
        
        # Initialize calendar manager from your existing code
        calendar_manager = CalendarManager(service)
        
        # Parse date range if provided
        time_min = None
        if request.start_date:
            time_min = datetime.datetime.fromisoformat(request.start_date)
        else:
            time_min = datetime.datetime.now(datetime.timezone.utc)
        
        # Get events from calendar
        calendar_events = calendar_manager.get_upcoming_events(
            max_results=10,
            time_min=time_min
        )
        
        # Convert to our response format
        events = []
        for event in calendar_events:
            # Extract start and end times
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            # Create Event object
            events.append(Event(
                id=event['id'],
                title=event['summary'],
                start=start,
                end=end,
                description=event.get('description'),
                location=event.get('location'),
                attendees=event.get('attendees')
            ))
        
        # Return formatted response
        return EventsListResponse(events=events)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing events: {str(e)}"
        )

@router.delete("/events/{event_id}", response_model=EventResponse)
async def delete_event(event_id: str, user_email: str, access_token: str):
    """
    Delete an event from the user's calendar.
    
    This endpoint integrates with your existing calendar integration code
    to delete events from Google Calendar.
    """
    try:
        # Get Google Calendar service
        service = get_calendar_service(access_token)
        
        # Initialize calendar manager from your existing code
        calendar_manager = CalendarManager(service)
        
        # Delete the event
        calendar_manager.delete_event(event_id)
        
        # Return success response
        return EventResponse(
            success=True,
            event_id=event_id,
            message="Event deleted successfully"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting event: {str(e)}"
        )