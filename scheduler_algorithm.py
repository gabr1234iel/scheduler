# scheduler_algorithm.py

import datetime
from typing import List, Tuple, Dict, Any, Optional
from calendar_integration import CalendarManager

class SchedulerAlgorithm:
    """
    Core scheduling algorithm for finding optimal time slots
    """
    
    def __init__(self, calendar_manager: CalendarManager):
        """
        Initialize with a calendar manager
        
        Args:
            calendar_manager: Calendar manager instance
        """
        self.calendar_manager = calendar_manager
    
    def find_collaborative_slot(
        self,
        participants: List[str],
        duration: int,
        priority: int,
        preferred_time: str,
        date_range: Tuple[datetime.datetime, datetime.datetime]
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Find available slots for a collaborative event
        
        Args:
            participants: List of participant emails
            duration: Duration in minutes
            priority: Priority level (1-5)
            preferred_time: Preferred time of day
            date_range: (start_time, end_time) tuple
            
        Returns:
            List of (start_time, end_time) tuples representing available slots
        """
        start_time, end_time = date_range
        
        # Fetch all calendars
        calendar_ids = ['primary']  # In a real app, map emails to calendar IDs
        
        # Get busy periods for all participants
        # The busy periods are now directly returned as (start, end) datetime tuples
        busy_periods = self.calendar_manager.get_busy_periods(
            start_time, end_time, calendar_ids
        )
        
        # Combine all busy periods
        all_busy_periods = []
        for cal_id, periods in busy_periods.items():
            all_busy_periods.extend(periods)
        
        # Print debug info
        print(f"Found {len(all_busy_periods)} busy periods")
        
        # Find common free slots
        common_slots = self._find_free_slots(
            start_time, end_time, all_busy_periods, duration
        )
        
        # Filter by preferred time
        filtered_slots = self._filter_by_time_preference(
            common_slots, preferred_time
        )
        
        # Rank slots
        ranked_slots = self._rank_slots(
            filtered_slots, priority, participants
        )
        
        return ranked_slots
    
    def find_individual_slot(
        self,
        activity_type: str,
        duration: int,
        priority: int,
        preferred_time: str,
        date_range: Tuple[datetime.datetime, datetime.datetime],
        buffer_time: Optional[Tuple[int, int]] = None
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Find available slots for an individual event
        
        Args:
            activity_type: Type of activity (work/exercise/personal)
            duration: Duration in minutes
            priority: Priority level (1-5)
            preferred_time: Preferred time of day
            date_range: (start_time, end_time) tuple
            buffer_time: (before, after) buffer times in minutes
            
        Returns:
            List of (start_time, end_time) tuples representing available slots
        """
        start_time, end_time = date_range
        
        # Calculate total duration including buffer time
        total_duration = duration
        if buffer_time:
            before_buffer, after_buffer = buffer_time
            total_duration += before_buffer + after_buffer
        
        # Get busy periods - now directly as datetime tuples
        busy_periods_dict = self.calendar_manager.get_busy_periods(
            start_time, end_time, ['primary']
        )
        
        # Extract busy periods from the result
        busy_ranges = busy_periods_dict.get('primary', [])
        
        # Find free slots
        free_slots = self._find_free_slots(
            start_time, end_time, busy_ranges, total_duration
        )
        
        # Filter by time preference and activity type
        filtered_slots = self._filter_slots_for_individual(
            free_slots, preferred_time, activity_type
        )
        
        # Rank slots for individual activities
        ranked_slots = self._rank_individual_slots(
            filtered_slots, activity_type, priority
        )
        
        return ranked_slots
    
    def _find_free_slots(
        self,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        busy_ranges: List[Tuple[datetime.datetime, datetime.datetime]],
        duration_minutes: int
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Find free time slots between busy periods
        
        Args:
            start_time: Start of the time range
            end_time: End of the time range
            busy_ranges: List of (start, end) tuples for busy periods
            duration_minutes: Minimum duration in minutes
            
        Returns:
            List of (start, end) tuples for free slots
        """
        duration = datetime.timedelta(minutes=duration_minutes)
        free_slots = []
        
        # Sort busy ranges
        busy_ranges.sort(key=lambda x: x[0])
        
        # Merge overlapping busy ranges
        merged_busy = []
        for busy in busy_ranges:
            if not merged_busy or busy[0] > merged_busy[-1][1]:
                merged_busy.append(busy)
            else:
                merged_busy[-1] = (merged_busy[-1][0], max(merged_busy[-1][1], busy[1]))
        
        # Start with the beginning of the range
        current_time = start_time
        
        for busy_start, busy_end in merged_busy:
            # Check if there's enough time before this busy period
            if busy_start - current_time >= duration:
                free_slots.append((current_time, busy_start))
            
            # Move to the end of this busy period
            current_time = busy_end
        
        # Check if there's time after the last busy period
        if end_time - current_time >= duration:
            free_slots.append((current_time, end_time))
        
        return free_slots
    
    def _filter_by_time_preference(
        self,
        slots: List[Tuple[datetime.datetime, datetime.datetime]],
        time_preference: str
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Filter slots by time preference
        
        Args:
            slots: List of (start, end) tuples
            time_preference: Preferred time of day
            
        Returns:
            Filtered list of slots
        """
        if time_preference == 'no preference':
            return slots
        
        filtered_slots = []
        
        for start, end in slots:
            # Define time ranges (UTC)
            morning_start = datetime.time(5, 0)
            morning_end = datetime.time(12, 0)
            
            afternoon_start = datetime.time(12, 0)
            afternoon_end = datetime.time(17, 0)
            
            evening_start = datetime.time(17, 0)
            evening_end = datetime.time(23, 0)
            
            start_time = start.time()
            
            if time_preference == 'morning' and morning_start <= start_time < morning_end:
                filtered_slots.append((start, end))
            elif time_preference == 'afternoon' and afternoon_start <= start_time < afternoon_end:
                filtered_slots.append((start, end))
            elif time_preference == 'evening' and evening_start <= start_time < evening_end:
                filtered_slots.append((start, end))
        
        return filtered_slots
    
    def _filter_slots_for_individual(
        self,
        slots: List[Tuple[datetime.datetime, datetime.datetime]],
        time_preference: str,
        activity_type: str
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Filter slots for individual activities based on time preference and activity type
        
        Args:
            slots: List of (start, end) tuples
            time_preference: Preferred time of day
            activity_type: Type of activity
            
        Returns:
            Filtered list of slots
        """
        # First filter by time preference
        time_filtered = self._filter_by_time_preference(slots, time_preference)
        
        # Then apply activity-specific filters
        activity_filtered = []
        
        for start, end in time_filtered:
            # Activity-specific rules
            if activity_type == 'exercise':
                # Prefer morning for exercise
                if start.time() < datetime.time(12, 0):
                    activity_filtered.append((start, end, 1.5))  # Bonus score
                else:
                    activity_filtered.append((start, end, 1.0))  # Normal score
            
            elif activity_type == 'work':
                # Prefer standard work hours
                if datetime.time(9, 0) <= start.time() < datetime.time(17, 0):
                    activity_filtered.append((start, end, 1.5))  # Bonus score
                else:
                    activity_filtered.append((start, end, 0.8))  # Penalty score
            
            else:  # personal
                # Prefer evening/weekend for personal activities
                if start.time() >= datetime.time(17, 0) or start.weekday() >= 5:
                    activity_filtered.append((start, end, 1.5))  # Bonus score
                else:
                    activity_filtered.append((start, end, 1.0))  # Normal score
        
        # Sort by score and return just the slots
        return [(start, end) for start, end, _ in 
                sorted(activity_filtered, key=lambda x: x[2], reverse=True)]
    
    def _rank_slots(
        self,
        slots: List[Tuple[datetime.datetime, datetime.datetime]],
        priority: int,
        participants: List[str]
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Rank slots for collaborative events
        
        Args:
            slots: List of (start, end) tuples
            priority: Priority level (1-5)
            participants: List of participant emails
            
        Returns:
            Sorted list of slots from best to worst
        """
        # In a real implementation, this would consider:
        # - Working hours for each participant
        # - Historical meeting success rates
        # - Proximity to preferred time
        # - Calendar density around the slot
        
        # For simplicity, we'll do a basic ranking
        ranked_slots = []
        
        for start, end in slots:
            # Calculate base score
            score = 1.0
            
            # Higher score for standard working hours
            if datetime.time(9, 0) <= start.time() < datetime.time(17, 0):
                score *= 1.5
            
            # Higher score for weekdays
            if start.weekday() < 5:  # Monday to Friday
                score *= 1.2
            
            # Adjust for priority
            score *= (priority / 3.0)  # Normalize priority effect
            
            ranked_slots.append((start, end, score))
        
        # Sort by score and return just the slots
        return [(start, end) for start, end, _ in 
                sorted(ranked_slots, key=lambda x: x[2], reverse=True)]
    
    def _rank_individual_slots(
        self,
        slots: List[Tuple[datetime.datetime, datetime.datetime]],
        activity_type: str,
        priority: int
    ) -> List[Tuple[datetime.datetime, datetime.datetime]]:
        """
        Rank slots for individual events
        
        Args:
            slots: List of (start, end) tuples
            activity_type: Type of activity
            priority: Priority level (1-5)
            
        Returns:
            Sorted list of slots from best to worst
        """
        # The slots are already pre-filtered and scored by _filter_slots_for_individual
        # This method would add additional ranking factors in a full implementation
        
        return slots