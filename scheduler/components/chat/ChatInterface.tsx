// components/chat/chat-interface.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  MessageSquare, 
  Send, 
  User,
  ChevronRight,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

// Message types
type MessageType = "text" | "options" | "slots" | "confirmation";

interface Message {
  id: string;
  type: MessageType;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  options?: string[];
  slots?: Array<{
    id: string;
    start: string;
    end: string;
    selected?: boolean;
  }>;
  confirmed?: boolean;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Initial greeting message
  useEffect(() => {
    setTimeout(() => {
      setMessages([
        {
          id: "welcome",
          type: "text",
          content: "Hi there! I'm your scheduling assistant. How can I help you today?",
          sender: "bot",
          timestamp: new Date(),
        },
        {
          id: "options",
          type: "options",
          content: "Here are some things I can do:",
          sender: "bot",
          timestamp: new Date(),
          options: [
            "Schedule a meeting with someone",
            "Create a personal event",
            "Find a good time for an event next week",
            "View my upcoming events"
          ],
        },
      ]);
    }, 500);
  }, []);
  
  const handleSend = async () => {
    if (input.trim() === "") return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "text",
      content: input,
      sender: "user",
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    
    try {
      // Send message to API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      
      const data = await response.json();
      
      // Process main response
      const botMessage: Message = {
        id: Date.now().toString() + "-response",
        type: data.type as MessageType,
        content: data.content,
        sender: "bot",
        timestamp: new Date(),
        ...(data.slots && { slots: data.slots }),
        ...(data.options && { options: data.options }),
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Process follow-up if present
      if (data.followUp) {
        setTimeout(() => {
          const followUpMessage: Message = {
            id: Date.now().toString() + "-followup",
            type: data.followUp.type as MessageType,
            content: data.followUp.content,
            sender: "bot",
            timestamp: new Date(),
            ...(data.followUp.options && { options: data.followUp.options }),
            ...(data.followUp.slots && { slots: data.followUp.slots }),
          };
          
          setMessages((prev) => [...prev, followUpMessage]);
        }, 1000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        type: "text",
        content: "Sorry, there was an error processing your request. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleOptionClick = (option: string) => {
    setInput(option);
    handleSend();
  };
  
  const handleSlotSelect = async (slotId: string) => {
    setMessages((prev) => 
      prev.map((msg) => {
        if (msg.type === "slots" && msg.slots) {
          return {
            ...msg,
            slots: msg.slots.map((slot) => ({
              ...slot,
              selected: slot.id === slotId,
            })),
          };
        }
        return msg;
      })
    );
    
    // Add confirmation message
    const confirmationMessage: Message = {
      id: Date.now().toString(),
      type: "confirmation",
      content: "Would you like to schedule this event?",
      sender: "bot",
      timestamp: new Date(),
      options: ["Confirm", "Cancel"],
    };
    
    setTimeout(() => {
      setMessages((prev) => [...prev, confirmationMessage]);
    }, 500);
  };
  
  const formatTimeSlot = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${formatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.sender === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              {message.sender === "bot" && (
                <div className="flex items-center mb-2 space-x-2">
                  <Avatar className="h-6 w-6 bg-blue-100">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </Avatar>
                  <span className="font-medium text-sm text-gray-700">Scheduler Bot</span>
                </div>
              )}
              
              {message.type === "text" && <p className="whitespace-pre-line">{message.content}</p>}
              
              {message.type === "options" && (
                <div className="space-y-2">
                  <p className="mb-2">{message.content}</p>
                  <div className="flex flex-wrap gap-2">
                    {message.options?.map((option) => (
                      <Button
                        key={option}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                        onClick={() => handleOptionClick(option)}
                      >
                        {option}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {message.type === "slots" && message.slots && (
                <div className="space-y-3">
                  <p className="mb-2">{message.content}</p>
                  <div className="space-y-2">
                    {message.slots.map((slot) => (
                      <Card
                        key={slot.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          slot.selected
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => handleSlotSelect(slot.id)}
                      >
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-500" />
                          <span>{formatTimeSlot(slot.start, slot.end)}</span>
                          {slot.selected && (
                            <CheckCircle2 className="ml-auto h-5 w-5 text-blue-500" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {message.type === "confirmation" && (
                <div className="space-y-2">
                  <p>{message.content}</p>
                  <div className="flex space-x-2 mt-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleOptionClick("Confirm")}
                    >
                      Confirm
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOptionClick("Cancel")}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 mt-2 text-right">
                {new Intl.DateTimeFormat("en", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-white border shadow-sm">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "600ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Textarea
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-h-[50px] max-h-[150px]"
            rows={1}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isTyping} className="self-end">
            {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}