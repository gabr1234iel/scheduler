# app/api/chat.py
from fastapi import APIRouter, HTTPException, status, Request
from app.models.schemas import ChatMessageRequest, ChatResponse, TimeSlot, FollowUp
from app.utils.auth import get_calendar_service
import datetime
import os
import sys
import json

# Add parent directory to path to import the existing scheduler code
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import your existing scheduler modules - comment out if not available yet
# from scheduler_algorithm import SchedulerAlgorithm
# from calendar_integration import CalendarManager

# Create router
router = APIRouter()

# Add debug logging function
def log_debug(message, data=None):
    """Log debug information"""
    print(f"DEBUG: {message}")
    if data:
        print(f"DATA: {json.dumps(data, default=str)}")

@router.post("/chat", response_model=ChatResponse)
async def process_chat_message(request: ChatMessageRequest, raw_request: Request):
    """
    Process a chat message and return a response.
    
    This endpoint integrates with the existing scheduler algorithm to handle
    calendar-related requests.
    """
    try:
        # Log the request for debugging
        request_body = await raw_request.json()
        log_debug("Received chat request", request_body)
        
        # Log what was parsed
        log_debug("Parsed request", {
            "message": request.message,
            "user_email": request.user_email,
            "has_access_token": bool(request.access_token)
        })
        
        # Get Google Calendar service from access token - comment out if not ready to use
        # service = get_calendar_service(request.access_token)
        
        # Initialize calendar manager and scheduler algorithm - comment out if not ready
        # calendar_manager = CalendarManager(service)
        # scheduler = SchedulerAlgorithm(calendar_manager)
        
        # Process message using scheduler logic
        message = request.message.lower()
        
        # Handle schedule-related messages
        if "schedule" in message or "meeting" in message or "event" in message:
            return ChatResponse(
                type="text",
                content="I'll help you schedule an event. Let me ask a few questions to find the best time.",
                followUp=FollowUp(
                    type="options",
                    content="Is this a collaborative event requiring other participants?",
                    options=["Yes", "No"]
                )
            )
        
        # Handle finding available times
        elif ("find" in message or "suggest" in message) and ("time" in message or "slot" in message):
            # For a real implementation, call your scheduler to find slots
            # For now, create dummy data
            now = datetime.datetime.now(datetime.timezone.utc)
            slots = []
            for i in range(4):
                start = now + datetime.timedelta(days=(i//2), hours=(9 + (i%2)*4))
                end = start + datetime.timedelta(hours=1)
                
                slots.append(TimeSlot(
                    id=f"slot-{i}",
                    start=start.isoformat(),
                    end=end.isoformat()
                ))
            
            return ChatResponse(
                type="slots",
                content="I found these available slots for you:",
                slots=slots
            )
        
        # Handle viewing calendar events
        elif "view" in message and ("event" in message or "calendar" in message):
            # Get upcoming events from your calendar manager - comment out if not ready
            # events = calendar_manager.get_upcoming_events(max_results=5)
            
            # For this example, return dummy data
            events_text = "Here are your upcoming events:\n• Tomorrow, 10:00 AM - Weekly Team Meeting\n• Friday, 2:00 PM - Project Review\n• Monday, 9:30 AM - Client Call"
            
            return ChatResponse(
                type="text",
                content=events_text
            )
        
        # Handle yes/no answers for event creation flow
        elif message == "yes":
            return ChatResponse(
                type="text",
                content="Great! Let's set up a collaborative event. Who needs to attend?",
                followUp=FollowUp(
                    type="text",
                    content="Please enter email addresses of participants separated by commas."
                )
            )
        
        elif message == "no":
            return ChatResponse(
                type="text",
                content="Perfect! Let's set up a personal event. What type of activity is this?",
                followUp=FollowUp(
                    type="options",
                    content="What type of activity is this?",
                    options=["Work", "Exercise", "Personal"]
                )
            )
        
        # Handle event confirmation/cancellation
        elif "confirm" in message:
            return ChatResponse(
                type="text",
                content="Great! I've scheduled the event on your calendar. Is there anything else you'd like me to help with?"
            )
        
        elif "cancel" in message:
            return ChatResponse(
                type="text",
                content="No problem. I've canceled the event creation. Is there anything else you'd like to do?"
            )
        
        # Default response for unrecognized messages
        return ChatResponse(
            type="text",
            content="I can help you schedule events, find available time slots, or view your calendar. What would you like to do?",
            followUp=FollowUp(
                type="options",
                content="Here are some things I can do:",
                options=[
                    "Schedule a meeting with someone",
                    "Create a personal event",
                    "Find a good time for an event next week",
                    "View my upcoming events"
                ]
            )
        )
    
    except Exception as e:
        log_debug(f"Error processing chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )