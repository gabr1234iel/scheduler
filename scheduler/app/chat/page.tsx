// app/chat/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInterface from "@/components/chat/ChatInterface";

export default function ChatPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login");
    },
  });
  
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">Scheduler Assistant</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/preferences')}
          className="flex items-center"
        >
          <Settings className="h-4 w-4 mr-1" />
          <span>Preferences</span>
        </Button>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}