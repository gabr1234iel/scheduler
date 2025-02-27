// app/preferences/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const formSchema = z.object({
  workDayStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use 24hr format (HH:MM)"),
  workDayEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use 24hr format (HH:MM)"),
  sleepTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use 24hr format (HH:MM)"),
  wakeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please use 24hr format (HH:MM)"),
  preferredMeetingDuration: z.string(),
  defaultBufferBefore: z.string(),
  defaultBufferAfter: z.string(),
  preferredTimeOfDay: z.string(),
  workOnWeekends: z.boolean().default(false),
});

export default function UserPreferencesPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login");
    },
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workDayStart: "09:00",
      workDayEnd: "17:00",
      sleepTime: "23:00",
      wakeTime: "07:00",
      preferredMeetingDuration: "60",
      defaultBufferBefore: "15",
      defaultBufferAfter: "15",
      preferredTimeOfDay: "afternoon",
      workOnWeekends: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Save preferences to backend
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }
      
      toast.success("Preferences saved!", {
        description: "Your scheduling preferences have been updated."
      });
      
      // Navigate to the chat interface
      router.push("/chat");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Error", {
        description: "Failed to save preferences. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Set Your Schedule Preferences</CardTitle>
          <CardDescription>
            Help the scheduler understand your preferences for optimal scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="workDayStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Day Start</FormLabel>
                      <FormControl>
                        <Input placeholder="09:00" {...field} />
                      </FormControl>
                      <FormDescription>When your workday typically begins</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="workDayEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Day End</FormLabel>
                      <FormControl>
                        <Input placeholder="17:00" {...field} />
                      </FormControl>
                      <FormDescription>When your workday typically ends</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="wakeTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wake Up Time</FormLabel>
                      <FormControl>
                        <Input placeholder="07:00" {...field} />
                      </FormControl>
                      <FormDescription>When you typically wake up</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sleepTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Time</FormLabel>
                      <FormControl>
                        <Input placeholder="23:00" {...field} />
                      </FormControl>
                      <FormDescription>When you typically go to sleep</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="preferredMeetingDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Meeting Duration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Default meeting length</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="preferredTimeOfDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time of Day</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time of day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning</SelectItem>
                          <SelectItem value="afternoon">Afternoon</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="no preference">No Preference</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>When you prefer to have meetings</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="defaultBufferBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Buffer Before (minutes)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select buffer time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">0 minutes</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Buffer time before events</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="defaultBufferAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Buffer After (minutes)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select buffer time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">0 minutes</SelectItem>
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Buffer time after events</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="workOnWeekends"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Work on Weekends</FormLabel>
                      <FormDescription>
                        Allow scheduling events on weekends
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Preferences"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}