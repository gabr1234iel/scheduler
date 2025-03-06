// app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { CalendarService, getCalendarServiceFromSession } from '@/lib/calendar-service';

/**
 * POST /api/events
 * Creates a new calendar event
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const calendarService = getCalendarServiceFromSession(session);
    
    if (!calendarService) {
      return NextResponse.json(
        { error: 'Failed to initialize calendar service' }, 
        { status: 500 }
      );
    }
    
    const eventData = await request.json();
    
    // Validate required fields
    if (!eventData.summary || !eventData.startDateTime || !eventData.endDateTime) {
      return NextResponse.json(
        { error: 'Missing required fields (summary, startDateTime, endDateTime)' }, 
        { status: 400 }
      );
    }
    
    const createdEvent = await calendarService.createEvent(eventData);
    
    return NextResponse.json({
      success: true,
      event: createdEvent
    });
  } catch (error: any) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/events
 * Retrieves upcoming events
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const calendarService = getCalendarServiceFromSession(session);
    
    if (!calendarService) {
      return NextResponse.json(
        { error: 'Failed to initialize calendar service' }, 
        { status: 500 }
      );
    }
    
    // Extract the maxResults from query params if provided
    const url = new URL(request.url);
    const maxResults = url.searchParams.get('maxResults') 
      ? parseInt(url.searchParams.get('maxResults')!) 
      : undefined;
    
    const events = await calendarService.getUpcomingEvents(maxResults);
    
    return NextResponse.json({
      success: true,
      events
    });
  } catch (error: any) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get events' }, 
      { status: 500 }
    );
  }
}