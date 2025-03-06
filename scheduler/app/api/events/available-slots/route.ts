// app/api/events/available-slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getCalendarServiceFromSession } from '@/lib/calendar-service';

/**
 * GET /api/events/available-slots
 * Returns available time slots between specified dates
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
    
    // Extract query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const duration = url.searchParams.get('duration');
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and endDate' }, 
        { status: 400 }
      );
    }
    
    // Convert duration to minutes
    const durationMinutes = duration ? parseInt(duration) : 60;
    
    const availableSlots = await calendarService.findAvailableSlots(
      startDate,
      endDate,
      durationMinutes
    );
    
    return NextResponse.json({
      success: true,
      slots: availableSlots
    });
  } catch (error: any) {
    console.error('Error in available slots API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to find available slots' }, 
      { status: 500 }
    );
  }
}