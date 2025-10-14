import { useState, useEffect } from "react";
import { Event } from "@/types/admin";
import { Question } from "@/types/question";
import { User } from "@/types/user";

type AdminData = {
  events: Event[];
  questions: Question[];
  users: User[];
  loading: boolean;
  error: any;
};

export const useAdminData = (): AdminData => {
  const [events, setEvents] = useState<Event[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [eventsRes, questionsRes, usersRes] = await Promise.allSettled([
          fetch("/api/admin/events"),
          fetch("/api/admin/questions"),
          fetch("/api/admin/users"),
        ]);

        // Handle events
        if (eventsRes.status === "fulfilled") {
          const res = eventsRes.value;
          if (res.ok) {
            const eventsData = await res.json();
            setEvents(eventsData.events || []);
          } else {
            console.error("Failed to fetch events:", res.statusText);
          }
        } else {
          console.error("Failed to fetch events:", eventsRes.reason);
        }

        // Handle questions
        if (questionsRes.status === "fulfilled") {
          const res = questionsRes.value;
          if (res.ok) {
            const questionsData = await res.json();
            setQuestions(questionsData.questions || []);
          } else {
            console.error("Failed to fetch questions:", res.statusText);
          }
        } else {
          console.error("Failed to fetch questions:", questionsRes.reason);
        }

        // Handle users
        if (usersRes.status === "fulfilled") {
          const res = usersRes.value;
          if (res.ok) {
            const usersData = await res.json();
            setUsers(usersData.users || []);
          } else {
            console.error("Failed to fetch users:", res.statusText);
          }
        } else {
          console.error("Failed to fetch users:", usersRes.reason);
        }
      } catch (err) {
        console.error("Unexpected error in admin data fetch:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { events, questions, users, loading, error };
};
