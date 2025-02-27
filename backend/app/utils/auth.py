# app/utils/auth.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from fastapi import HTTPException, status

def create_credentials(access_token: str, refresh_token: str = None):
    """
    Create Google OAuth2 credentials from access token.
    
    Args:
        access_token: The access token from Google OAuth
        refresh_token: Optional refresh token
        
    Returns:
        Google OAuth2 Credentials object
    """
    try:
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token
        )
        return credentials
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid credentials: {str(e)}"
        )

def get_calendar_service(access_token: str, refresh_token: str = None):
    """
    Create Google Calendar API service from OAuth tokens.
    
    Args:
        access_token: The access token from Google OAuth
        refresh_token: Optional refresh token
        
    Returns:
        Google Calendar API service
    """
    credentials = create_credentials(access_token, refresh_token)
    
    try:
        service = build('calendar', 'v3', credentials=credentials)
        return service
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to create calendar service: {str(e)}"
        )