import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type ProgressStats = {
  completedCount: number;
  totalCount: number;
};

export const useProgress = () => {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const response = await fetch("/api/progress");
        if (response.ok) {
          const data: ProgressStats = await response.json();
          setStats(data);
        } else {
          console.error("Failed to fetch progress");
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [session, status]);

  if (status === "loading" || !session?.user) {
    return { stats: null, loading: status === "loading" };
  }

  return { stats, loading: false };
};
