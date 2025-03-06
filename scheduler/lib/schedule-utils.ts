// lib/schedule-utils.ts
import { EventData } from './calendar-service';

/**
 * Interface representing user preferences for scheduling
 */
export interface UserPreferences {
  workDayStart: string; // Format: "HH:MM" (24-hour)
  workDayEnd: string; // Format: "HH:MM" (24-hour)
  sleepTime: string; // Format: "HH:MM" (24-hour)
  wakeTime: string; // Format: "HH:MM" (24-hour)
  preferredMeetingDuration: number; // In minutes
  defaultBufferBefore: number; // In minutes
  defaultBufferAfter: number; // In minutes
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'no preference';
  workOnWeekends: boolean;
}

/**
 * Converts a time string in HH:MM format to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to a time string in HH:MM format
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Checks if the given date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

/**
 * Checks if a proposed event time is compatible with user preferences
 */
export function isCompatibleWithPreferences(
  startDateTime: string,
  endDateTime: string,
  preferences: UserPreferences
): boolean {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  
  // Check for weekends
  if (!preferences.workOnWeekends && (isWeekend(startDate) || isWeekend(endDate))) {
    return false;
  }
  
  // Convert times to minutes for easier comparison
  const startTimeMinutes = startDate.getHours() * 60 + startDate.getMinutes();
  const endTimeMinutes = endDate.getHours() * 60 + endDate.getMinutes();
  const workDayStartMinutes = timeToMinutes(preferences.workDayStart);
  const workDayEndMinutes = timeToMinutes(preferences.workDayEnd);
  
  // Check if the time is within working hours
  if (startTimeMinutes < workDayStartMinutes || endTimeMinutes > workDayEndMinutes) {
    return false;
  }
  
  // Check preferred time of day
  if (preferences.preferredTimeOfDay !== 'no preference') {
    const morningEnd = 12 * 60; // 12:00 PM
    const afternoonEnd = 17 * 60; // 5:00 PM
    
    if (
      (preferences.preferredTimeOfDay === 'morning' && startTimeMinutes >= morningEnd) ||
      (preferences.preferredTimeOfDay === 'afternoon' && (startTimeMinutes < morningEnd || startTimeMinutes >= afternoonEnd)) ||
      (preferences.preferredTimeOfDay === 'evening' && startTimeMinutes < afternoonEnd)
    ) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generates optimal meeting time suggestions based on user preferences
 */
export function generateMeetingSuggestions(
  preferences: UserPreferences,
  startDate: Date,
  endDate: Date,
  existingEvents: any[] = []
): Date[] {
  const suggestions: Date[] = [];
  const currentDate = new Date(startDate);
  
  // Loop through each day in the date range
  while (currentDate <= endDate) {
    // Skip weekends if not working on weekends
    if (!preferences.workOnWeekends && isWeekend(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    // Determine time range for this day
    const workDayStartMinutes = timeToMinutes(preferences.workDayStart);
    const workDayEndMinutes = timeToMinutes(preferences.workDayEnd);
    
    // Determine preferred time of day
    let startTimeMinutes = workDayStartMinutes;
    let endTimeMinutes = workDayEndMinutes;
    
    if (preferences.preferredTimeOfDay === 'morning') {
      endTimeMinutes = Math.min(endTimeMinutes, 12 * 60); // End at noon
    } else if (preferences.preferredTimeOfDay === 'afternoon') {
      startTimeMinutes = Math.max(startTimeMinutes, 12 * 60); // Start at noon
      endTimeMinutes = Math.min(endTimeMinutes, 17 * 60); // End at 5 PM
    } else if (preferences.preferredTimeOfDay === 'evening') {
      startTimeMinutes = Math.max(startTimeMinutes, 17 * 60); // Start at 5 PM
    }
    
    // Generate time slots
    for (
      let timeSlotStart = startTimeMinutes;
      timeSlotStart + preferences.preferredMeetingDuration <= endTimeMinutes;
      timeSlotStart += 30 // 30-minute increments
    ) {
      const timeSlotEnd = timeSlotStart + preferences.preferredMeetingDuration;
      
      // Skip if this time conflicts with existing events
      if (hasConflict(currentDate, timeSlotStart, timeSlotEnd, existingEvents)) {
        continue;
      }
      
      // Create a new date for this suggestion
      const suggestionDate = new Date(currentDate);
      suggestionDate.setHours(Math.floor(timeSlotStart / 60));
      suggestionDate.setMinutes(timeSlotStart % 60);
      suggestionDate.setSeconds(0);
      suggestionDate.setMilliseconds(0);
      
      suggestions.push(suggestionDate);
    }
    
    // Move to the next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  
  return suggestions;
}

/**
 * Checks if a proposed time slot conflicts with existing events
 */
function hasConflict(
  date: Date,
  startMinutes: number,
  endMinutes: number,
  existingEvents: any[]
): boolean {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const startTime = new Date(year, month, day, Math.floor(startMinutes / 60), startMinutes % 60);
  const endTime = new Date(year, month, day, Math.floor(endMinutes / 60), endMinutes % 60);
  
  return existingEvents.some(event => {
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    
    return (
      (startTime >= eventStart && startTime < eventEnd) || // Start time is within an event
      (endTime > eventStart && endTime <= eventEnd) || // End time is within an event
      (startTime <= eventStart && endTime >= eventEnd) // Event is completely within the time slot
    );
  });
}

/**
 * Creates an EventData object from user input and preferences
 */
export function createEventFromInput(
  title: string,
  description: string,
  startTime: Date,
  attendees: string[] = [],
  preferences: UserPreferences
): EventData {
  // Calculate end time based on preferred duration
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + preferences.preferredMeetingDuration);
  
  return {
    summary: title,
    description,
    startDateTime: startTime.toISOString(),
    endDateTime: endTime.toISOString(),
    attendees: attendees.map(email => ({ email })),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Parses natural language date input
 * 
 * Basic implementation - in a real app, you might use a library like chrono-node
 */
export function parseNaturalDate(dateText: string): Date | null {
  const lowerText = dateText.toLowerCase();
  const now = new Date();
  
  if (lowerText.includes('today')) {
    return now;
  }
  
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  if (lowerText.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }
  
  // Attempt to parse as a regular date
  const parsedDate = new Date(dateText);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  return null;
}