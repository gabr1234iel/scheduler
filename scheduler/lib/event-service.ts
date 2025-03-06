// lib/event-service.ts
import { EventData } from './calendar-service';
import { UserPreferences } from './schedule-utils';

/**
 * Service to handle event creation logic and API requests
 */
export class EventService {
  /**
   * Create a new event in the user's calendar
   */
  static async createEvent(eventData: EventData): Promise<any> {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  /**
   * Get available time slots based on date range and meeting duration
   */
  static async getAvailableSlots(
    startDate: string,
    endDate: string,
    durationMinutes: number = 60,
    timeZone?: string
  ): Promise<{ start: string; end: string }[]> {
    try {
      // Build URL with query parameters
      const url = new URL('/api/events/available-slots', window.location.origin);
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);
      url.searchParams.append('duration', durationMinutes.toString());
      if (timeZone) url.searchParams.append('timeZone', timeZone);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get available slots');
      }

      const data = await response.json();
      return data.slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(maxResults?: number): Promise<any[]> {
    try {
      const url = new URL('/api/events', window.location.origin);
      if (maxResults) url.searchParams.append('maxResults', maxResults.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get events');
      }

      const data = await response.json();
      return data.events;
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  static async updateEvent(eventId: string, eventData: Partial<EventData>): Promise<any> {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  /**
   * Delete an event
   */
  static async deleteEvent(eventId: string): Promise<void> {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Process chat-based scheduling request
   */
  static async processSchedulingRequest(
    message: string,
    userPreferences: UserPreferences
  ): Promise<any> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          preferences: userPreferences,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process scheduling request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing scheduling request:', error);
      throw error;
    }
  }

  /**
   * Confirm and create an event based on selected time slot
   */
  static async confirmEvent(
    title: string,
    description: string,
    startDateTime: string,
    endDateTime: string,
    attendees: string[] = []
  ): Promise<any> {
    const eventData: EventData = {
      summary: title,
      description,
      startDateTime,
      endDateTime,
      attendees: attendees.map(email => ({ email })),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return await this.createEvent(eventData);
  }
}