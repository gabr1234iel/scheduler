// lib/calendar-service.ts
import { google, calendar_v3 } from 'googleapis';
import { Session } from 'next-auth';

export interface EventData {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  attendees?: { email: string }[];
  timeZone?: string;
}

export class CalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Creates a new event in the user's primary calendar
   */
  async createEvent(eventData: EventData): Promise<calendar_v3.Schema$Event> {
    const { summary, description, location, startDateTime, endDateTime, attendees, timeZone = 'UTC' } = eventData;

    const event: calendar_v3.Schema$Event = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees,
      reminders: {
        useDefault: true,
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none',
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Gets a list of upcoming events from the user's primary calendar
   */
  async getUpcomingEvents(maxResults = 10): Promise<calendar_v3.Schema$Event[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId: string): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    eventData: Partial<EventData>
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const { summary, description, location, startDateTime, endDateTime, attendees, timeZone = 'UTC' } = eventData;

      const event: calendar_v3.Schema$Event = {};
      
      if (summary) event.summary = summary;
      if (description) event.description = description;
      if (location) event.location = location;
      
      if (startDateTime) {
        event.start = {
          dateTime: startDateTime,
          timeZone,
        };
      }
      
      if (endDateTime) {
        event.end = {
          dateTime: endDateTime,
          timeZone,
        };
      }
      
      if (attendees) event.attendees = attendees;

      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
        sendUpdates: attendees && attendees.length > 0 ? 'all' : 'none',
      });

      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Finds available time slots between start and end date
   */
  async findAvailableSlots(
    startDate: string,
    endDate: string,
    durationMinutes: number = 60
  ): Promise<{ start: string; end: string }[]> {
    try {
      // First get the busy periods
      const freeBusyRequest = {
        timeMin: new Date(startDate).toISOString(),
        timeMax: new Date(endDate).toISOString(),
        items: [{ id: 'primary' }],
      };

      const freeBusyResponse = await this.calendar.freebusy.query({
        requestBody: freeBusyRequest,
      });

      const busySlots = freeBusyResponse.data.calendars?.primary?.busy || [];

      // Create a list of available slots by considering the busy periods
      const availableSlots: { start: string; end: string }[] = [];
      const durationMs = durationMinutes * 60 * 1000;
      let currentTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();

      while (currentTime + durationMs <= endTime) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime + durationMs);

        // Check if this time slot overlaps with any busy period
        const isAvailable = !busySlots.some(busy => {
          const busyStart = new Date(busy.start!).getTime();
          const busyEnd = new Date(busy.end!).getTime();
          return (
            (currentTime >= busyStart && currentTime < busyEnd) ||
            (currentTime + durationMs > busyStart && currentTime + durationMs <= busyEnd) ||
            (currentTime <= busyStart && currentTime + durationMs >= busyEnd)
          );
        });

        if (isAvailable) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }

        // Move to the next slot (increment by 30 minutes)
        currentTime += 30 * 60 * 1000;
      }

      return availableSlots;
    } catch (error) {
      console.error('Error finding available slots:', error);
      throw error;
    }
  }
}

/**
 * Create a CalendarService instance from a Next.js session
 */
export function getCalendarServiceFromSession(session: Session | null): CalendarService | null {
  if (!session?.accessToken) {
    return null;
  }
  return new CalendarService(session.accessToken);
}