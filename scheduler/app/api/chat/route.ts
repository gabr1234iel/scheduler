// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

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
        // Pass the auth token if available
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
          // Ensure access_token is always provided (use a mock value if not available)
          access_token: session.accessToken || "mock-token", 
          // Add refresh_token field as it's in the backend schema
          refresh_token: null
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend error:", errorData);
        // Return a more user-friendly error instead of throwing
        return NextResponse.json(
          { 
            type: "text", 
            content: "Sorry, I encountered a problem connecting to the scheduler service. Please try again later." 
          }
        );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Use mock response for development
      console.log("Using mock response (enable real backend by setting USE_REAL_BACKEND=true)");
      const mockResponse = await mockChatResponse(message, session.user.email);
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

// Mock function to simulate bot responses
async function mockChatResponse(message: string, userEmail: string) {
  const lowerMessage = message.toLowerCase();
  
  // Wait to simulate API latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (lowerMessage.includes("schedule") || lowerMessage.includes("meeting") || lowerMessage.includes("event")) {
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
  
  // Rest of the mock implementation remains the same...
  
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