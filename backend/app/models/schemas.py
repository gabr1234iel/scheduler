# app/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union

# Chat API Schemas
class ChatMessageRequest(BaseModel):
    message: str
    user_email: str
    access_token: str
    refresh_token: Optional[str] = None
    
    class Config:
        # Allow extra fields to be present in the request
        extra = "ignore"

class TimeSlot(BaseModel):
    id: str
    start: str
    end: str

class FollowUp(BaseModel):
    type: str
    content: str
    options: Optional[List[str]] = None

class ChatResponse(BaseModel):
    type: str
    content: str
    followUp: Optional[Union[FollowUp, Dict[str, Any]]] = None
    slots: Optional[List[TimeSlot]] = None
    events: Optional[List[Dict[str, Any]]] = None

# Event API Schemas
class EventCreateRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    participants: Optional[List[str]] = None
    activity_type: Optional[str] = None
    priority: Optional[int] = 3
    buffer_before: Optional[int] = 0
    buffer_after: Optional[int] = 0
    user_email: str
    access_token: str
    
    class Config:
        # Allow extra fields to be present in the request
        extra = "ignore"

class EventResponse(BaseModel):
    success: bool
    event_id: Optional[str] = None
    event_link: Optional[str] = None
    message: str

class EventsListRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    user_email: str
    access_token: str
    
    class Config:
        # Allow extra fields to be present in the request
        extra = "ignore"

class Event(BaseModel):
    id: str
    title: str
    start: str
    end: str
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: Optional[List[Dict[str, str]]] = None