// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getCalendarServiceFromSession } from "@/lib/calendar-service";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { message } = await request.json();
    
    // Determine whether to use mock or real backend
    const useRealBackend = process.env.USE_REAL_BACKEND === "true";
    
    if (useRealBackend) {
      // Call the Python backend API
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
      
      // Log request details for debugging
      console.log("Sending to backend:", {
        message,
        user_email: session.user.email,
        access_token: session.accessToken || "mock-token",
      });
      
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          user_email: session.user.email,
          access_token: session.accessToken || "mock-token", 
          refresh_token: null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend error:", errorData);
        return NextResponse.json(
          { 
            type: "text", 
            content: "Sorry, I encountered a problem connecting to the scheduler service. Please try again." 
          }
        );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Use enhanced mock response for development
      console.log("Using mock response (enable real backend by setting USE_REAL_BACKEND=true)");
      const mockResponse = await enhancedMockChatResponse(message, session.user.email, session);
      return NextResponse.json(mockResponse);
    }
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { 
        type: "text", 
        content: "Sorry, something went wrong with the chat service. Please try again." 
      },
      { status: 200 } // Return 200 with error message to avoid frontend crashes
    );
  }
}

// Enhanced mock function with calendar integration
async function enhancedMockChatResponse(message: string, userEmail: string, session: any) {
  const lowerMessage = message.toLowerCase();
  
  // Wait to simulate API latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if user wants to view events
  if (lowerMessage.includes("view") || lowerMessage.includes("show") || 
      lowerMessage.includes("see") || lowerMessage.includes("list") || 
      lowerMessage.includes("upcoming") || lowerMessage.includes("events")) {
    
    // Try to get real calendar events if possible
    try {
      const calendarService = getCalendarServiceFromSession(session);
      if (calendarService) {
        const events = await calendarService.getUpcomingEvents(5);
        if (events && events.length > 0) {
          return {
            type: "text",
            content: `Here are your upcoming events:\n\n${events.map((e: any, i: number) => 
              `${i+1}. ${e.summary} - ${formatEventTime(e.start?.dateTime)}`).join('\n')}`
          };
        }
      }
    } catch (error) {
      console.log("Error getting calendar events:", error);
      // Fall back to mock response
    }
    
    // Mock response for events
    return {
      type: "text",
      content: "Here are your upcoming events:",
      followUp: {
        type: "text",
        content: "1. Team Meeting - Tomorrow, 10:00 AM\n2. Project Review - Wednesday, 2:00 PM\n3. Client Call - Friday, 11:30 AM"
      }
    };
  }
  
  // Check if this is a scheduling request
  if (lowerMessage.includes("schedule") || lowerMessage.includes("meeting") || 
      lowerMessage.includes("event") || lowerMessage.includes("appointment")) {
    
    // If specific day is mentioned
    if (lowerMessage.includes("tomorrow") || lowerMessage.includes("monday") || 
        lowerMessage.includes("tuesday") || lowerMessage.includes("wednesday") || 
        lowerMessage.includes("thursday") || lowerMessage.includes("friday")) {
      
      // Generate mock time slots
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const start = new Date(tomorrow);
        start.setHours(start.getHours() + (i * 2));
        
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        
        slots.push({
          id: `slot-${i}`,
          start: start.toISOString(),
          end: end.toISOString()
        });
      }
      
      return {
        type: "slots",
        content: "I found these available time slots. Which one works for you?",
        slots,
        followUp: {
          type: "options",
          content: "Or would you prefer different times?",
          options: ["Show more options", "Different day", "Cancel"]
        }
      };
    }
    
    // For collaborative meetings
    if (lowerMessage.includes("with") || lowerMessage.includes("team") || lowerMessage.includes("group")) {
      return {
        type: "text",
        content: "I'll help you schedule a collaborative event. I'll need some information to find the best time for everyone.",
        followUp: {
          type: "options",
          content: "Who would you like to include in this meeting?",
          options: [
            "My team",
            "Specific people",
            "Just me and one other person"
          ]
        }
      };
    }
    
    // Default scheduling response
    return {
      type: "text",
      content: "I'll help you schedule an event. Let me ask a few questions to find the best time.",
      followUp: {
        type: "options",
        content: "Is this a collaborative event requiring other participants?",
        options: ["Yes", "No"]
      }
    };
  }
  
  // Default response
  return {
    type: "text",
    content: "I can help you schedule events, find available time slots, or view your calendar. What would you like to do?",
    followUp: {
      type: "options",
      content: "Here are some things I can do:",
      options: [
        "Schedule a meeting with someone",
        "Create a personal event",
        "Find a good time for an event next week",
        "View my upcoming events"
      ]
    }
  };
}

// Helper function to format event times
function formatEventTime(dateTimeString?: string): string {
  if (!dateTimeString) return "Time not specified";
  
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}