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
        const [eventsRes, questionsRes, usersRes] = await Promise.all([
          fetch("/api/admin/events"),
          fetch("/api/admin/questions"),
          fetch("/api/admin/users"),
        ]);

        if (!eventsRes.ok || !questionsRes.ok || !usersRes.ok) {
          throw new Error("Failed to fetch admin data");
        }

        const [eventsData, questionsData, usersData] = await Promise.all([
          eventsRes.json(),
          questionsRes.json(),
          usersRes.json(),
        ]);

        setEvents(eventsData.events);
        setQuestions(questionsData.questions);
        setUsers(usersData.users);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { events, questions, users, loading, error };
};