"use client";

import { useState, useEffect } from "react";
import { User } from "@/types/user";

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

  const handleView = (userId: string) => {
    // Placeholder for view action
    console.log("View user:", userId);
  };

  const handleEdit = (userId: string) => {
    // Placeholder for edit action
    console.log("Edit user:", userId);
  };

  const handleDelete = (userId: string) => {
    // Placeholder for delete action
    console.log("Delete user:", userId);
  };

  if (loading) {
    return <div className="text-center p-4">Loading users...</div>;
  }

  if (users.length === 0) {
    return <div className="text-center p-4">No users found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.id}</td>
              <td>
                <div className="join">
                  <button
                    className="btn btn-sm btn-info join-item"
                    onClick={() => handleView(user.id)}
                    aria-label={`View details for ${user.name}`}
                  >
                    View
                  </button>
                  <button
                    className="btn btn-sm btn-warning join-item"
                    onClick={() => handleEdit(user.id)}
                    aria-label={`Edit ${user.name}`}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error join-item"
                    onClick={() => handleDelete(user.id)}
                    aria-label={`Delete ${user.name}`}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;