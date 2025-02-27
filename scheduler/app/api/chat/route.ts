import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

// In a real application, this would call your Python backend
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { message } = await request.json();
    
    // Call the Python backend API
    // const response = await fetch(`${process.env.BACKEND_URL}/api/chat`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     message,
    //     user_email: session.user.email,
    //   }),
    // });
    
    // For now, use a simple mock response
    const mockResponse = await mockChatResponse(message, session.user.email);
    
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
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
  
  if (lowerMessage.includes("find") && (lowerMessage.includes("time") || lowerMessage.includes("slot"))) {
    // Simulate finding available slots
    const now = new Date();
    const slots = Array(4).fill(0).map((_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() + Math.floor(i / 2));
      start.setHours(9 + (i % 2) * 4);
      start.setMinutes(0);
      
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      
      return {
        id: `slot-${i}`,
        start: start.toISOString(),
        end: end.toISOString()
      };
    });
    
    return {
      type: "slots",
      content: "I found these available slots for you:",
      slots
    };
  }
  
  if (lowerMessage.includes("view") && lowerMessage.includes("event")) {
    return {
      type: "text",
      content: "Here are your upcoming events:\n• Tomorrow, 10:00 AM - Weekly Team Meeting\n• Friday, 2:00 PM - Project Review\n• Monday, 9:30 AM - Client Call"
    };
  }
  
  if (lowerMessage === "yes" || lowerMessage === "no") {
    return {
      type: "text",
      content: lowerMessage === "yes" 
        ? "Great! Let's set up a collaborative event. Who needs to attend?" 
        : "Perfect! Let's set up a personal event. What type of activity is this?",
      followUp: lowerMessage === "yes"
        ? {
            type: "text",
            content: "Please enter email addresses of participants separated by commas."
          }
        : {
            type: "options",
            content: "What type of activity is this?",
            options: ["Work", "Exercise", "Personal"]
          }
    };
  }
  
  // Handle event confirmation
  if (lowerMessage.includes("confirm")) {
    return {
      type: "text",
      content: "Great! I've scheduled the event on your calendar. Is there anything else you'd like me to help with?"
    };
  }
  
  if (lowerMessage.includes("cancel")) {
    return {
      type: "text",
      content: "No problem. I've canceled the event creation. Is there anything else you'd like to do?"
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