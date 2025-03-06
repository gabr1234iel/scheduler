// app/api/events/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getCalendarServiceFromSession } from '@/lib/calendar-service';

/**
 * GET /api/events/[eventId]
 * Gets a specific event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    
    const eventId = params.eventId;
    const event = await calendarService.getEvent(eventId);
    
    return NextResponse.json({
      success: true,
      event
    });
  } catch (error: any) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get event' }, 
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/events/[eventId]
 * Updates an existing event
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    const eventId = params.eventId;
    
    const updatedEvent = await calendarService.updateEvent(eventId, eventData);
    
    return NextResponse.json({
      success: true,
      event: updatedEvent
    });
  } catch (error: any) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update event' }, 
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[eventId]
 * Deletes an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    
    const eventId = params.eventId;
    
    await calendarService.deleteEvent(eventId);
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' }, 
      { status: 500 }
    );
  }
}