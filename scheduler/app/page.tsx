// app/page.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MessageSquare, Users } from "lucide-react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is already logged in, redirect to chat page
    if (status === "authenticated") {
      router.push("/chat");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Your AI Calendar Assistant
              </h1>
              <p className="text-xl text-gray-600">
                Schedule events, coordinate meetings, and manage your calendar with ease using natural language.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="font-semibold"
                  onClick={() => router.push("/login")}
                >
                  Get Started
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => {
                    const featuresSection = document.getElementById("features");
                    featuresSection?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="rounded-xl bg-white shadow-xl p-6 border border-gray-200">
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 mb-2">How can I help you today?</p>
                    <div className="space-y-2">
                      <div className="bg-white rounded-md p-2 text-sm border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                        Schedule a meeting with my team next week
                      </div>
                      <div className="bg-white rounded-md p-2 text-sm border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                        Find a good time for a 1-hour workout
                      </div>
                      <div className="bg-white rounded-md p-2 text-sm border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                        Block time for focused work tomorrow
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-600 text-white rounded-lg p-4 flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="mb-2">I'll find available times for your team meeting next week.</p>
                  <div className="bg-blue-500 rounded-md p-3 text-sm">
                    <p className="font-medium mb-2">Available slots:</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        <span>Monday, 10:00 AM - 11:00 AM</span>
                      </li>
                      <li className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        <span>Tuesday, 2:00 PM - 3:00 PM</span>
                      </li>
                      <li className="flex items-center">
                        <Clock className="w-3 h-3 mr-2" />
                        <span>Wednesday, 9:00 AM - 10:00 AM</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How Scheduler Helps You</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI assistant understands natural language and your preferences to make scheduling effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Natural Language</h3>
              <p className="text-gray-600">
                Just ask for what you need in plain English. No more clicking through complex calendar interfaces.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Scheduling</h3>
              <p className="text-gray-600">
                Automatically finds optimal times based on everyone's availability and your preferences.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Collaborative Events</h3>
              <p className="text-gray-600">
                Easily coordinate meetings with multiple participants without the back-and-forth emails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to simplify your scheduling?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect your Google Calendar to get started with Scheduler today.
          </p>
          <Button 
            size="lg" 
            className="font-semibold"
            onClick={() => router.push("/login")}
          >
            Sign in with Google
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 px-4 text-center text-gray-500">
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} Scheduler. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}