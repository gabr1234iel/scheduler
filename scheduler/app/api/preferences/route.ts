import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

// In a real app, this would be stored in a database
const userPreferences = new Map();

export async function GET() {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Get user preferences
  const userEmail = session.user.email;
  const preferences = userPreferences.get(userEmail) || {};
  
  return NextResponse.json({ preferences });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const userEmail = session.user.email;
    
    // Store user preferences (in memory for demo)
    userPreferences.set(userEmail, body);
    
    // In a real app, we would:
    // 1. Validate the data
    // 2. Store in a database
    // 3. Update scheduling algorithms with new preferences
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}