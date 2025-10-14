"use client";

import { useState, useEffect } from "react";
import { User } from "@/types/user";
import UserListItem from "./UserListItem";

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is a placeholder for fetching data from the API
    const mockUsers: User[] = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ];
    setUsers(mockUsers);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="text-center p-4">No users found.</div>;
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <UserListItem key={user.id} user={user} />
      ))}
    </div>
  );
};

export default UserList;