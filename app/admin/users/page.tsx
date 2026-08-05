"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase"; 
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";

interface AppUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: string;
  lastActive?: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Undo Feature States
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AppUser | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          name: data.name || "Unknown User",
          email: data.email || "No email",
          role: data.role || "user",
          status: data.status || "active",
          createdAt: data.createdAt || "N/A",
          lastActive: data.lastActive || "N/A",
        });
      });
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterRole === "all" || 
      (filterRole === "suspended" ? user.status === "suspended" : user.role === filterRole);
      
    const isNotPendingDelete = pendingDeleteUser?.id !== user.id;

    return matchesSearch && matchesFilter && isNotPendingDelete;
  });

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!window.confirm(`Are you sure you want to make this user an ${newRole.toUpperCase()}?`)) return;

    setActionLoadingId(userId);
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (error) {
      alert("Failed to update role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const actionName = newStatus === "suspended" ? "Suspend" : "Reactivate";
    
    if (!window.confirm(`Are you sure you want to ${actionName} this user?`)) return;

    setActionLoadingId(userId);
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
    } catch (error) {
      alert(`Failed to ${actionName} user.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRequest = (user: AppUser) => {
    if (pendingDeleteUser) {
        forceDelete(pendingDeleteUser);
    }

    setPendingDeleteUser(user);

    const timer = setTimeout(() => {
        executeDelete(user);
    }, 5000);

    setUndoTimer(timer);
  };

  const executeDelete = async (userToDelete: AppUser) => {
    try {
        await deleteDoc(doc(db, "users", userToDelete.id));
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setPendingDeleteUser(null);
        setUndoTimer(null);

        await addDoc(collection(db, "activityLogs"), {
            userName: "Admin User",
            action: "Deleted User",
            details: `Permanently deleted user: ${userToDelete.email}`,
            type: "danger",
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error executing delete:", error);
        setPendingDeleteUser(null);
        alert("Failed to delete user permanently.");
    }
  };

  const forceDelete = async (userToDelete: AppUser) => {
    if(undoTimer) clearTimeout(undoTimer);
    try {
        await deleteDoc(doc(db, "users", userToDelete.id));
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        
        await addDoc(collection(db, "activityLogs"), {
            userName: "Admin User",
            action: "Deleted User",
            details: `Permanently deleted user: ${userToDelete.email}`,
            type: "danger",
            createdAt: new Date().toISOString(),
        });
    } catch(e) {
        console.error(e);
    }
  };

  const handleUndo = () => {
      if(undoTimer) {
          clearTimeout(undoTimer);
      }
      setPendingDeleteUser(null);
      setUndoTimer(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6 relative transition-colors">
      
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Manage Users 👥</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total Users: {users.length} | Active: {users.filter(u => u.status !== 'suspended').length}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
          />
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all" className="dark:bg-slate-900">All Users</option>
            <option value="admin" className="dark:bg-slate-900">Admins</option>
            <option value="user" className="dark:bg-slate-900">Regular Users</option>
            <option value="suspended" className="dark:bg-slate-900">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="pb-4 pl-2">User Details</th>
                <th className="pb-4">Joined Date</th>
                <th className="pb-4">Role & Status</th>
                <th className="pb-4 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-2"></div>
                      Fetching users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className={`transition group ${u.status === 'suspended' ? 'bg-red-50/30 dark:bg-red-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}>
                    
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${u.status === 'suspended' ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'}`}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`font-bold ${u.status === 'suspended' ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{u.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 text-slate-600 dark:text-slate-300 font-medium text-xs">
                      {u.createdAt && u.createdAt !== "N/A" 
                        ? new Date(u.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
                        : "Unknown"}
                    </td>

                    <td className="py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "admin" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}>
                          {u.role}
                        </span>
                        {u.status === "suspended" && (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                            Suspended
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 text-right pr-2">
                      <div className="flex items-center justify-end gap-2">
                        
                        {/* View Button */}
                        <button onClick={() => setSelectedUser(u)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition" title="View Details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        </button>

                        {/* Suspend Button */}
                        <button 
                          onClick={() => toggleUserStatus(u.id, u.status || 'active')}
                          disabled={actionLoadingId === u.id}
                          className={`p-2 rounded-lg transition ${u.status === 'suspended' ? 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40' : 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'}`}
                          title={u.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
                        </button>

                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDeleteRequest(u)}
                          disabled={actionLoadingId === u.id}
                          className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition" 
                          title="Delete User"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        {/* Role Button */}
                        <button
                          onClick={() => toggleUserRole(u.id, u.role)}
                          disabled={actionLoadingId === u.id}
                          className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm w-28 text-center ${
                            u.role === "admin"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                              : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          }`}
                        >
                          {actionLoadingId === u.id ? "Loading..." : u.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </button>

                      </div>
                    </td>
                    
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl relative border border-slate-200 dark:border-slate-800 transition-colors">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="text-center mb-6 mt-2">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3">
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{selectedUser.name}</h3>
              <p className="text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="font-semibold text-slate-600 dark:text-slate-400">User ID</span>
                <span className="text-slate-800 dark:text-slate-200 font-mono text-xs">{selectedUser.id}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Role</span>
                <span className="uppercase font-bold text-blue-600 dark:text-blue-400">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Status</span>
                <span className={`uppercase font-bold ${selectedUser.status === 'suspended' ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                  {selectedUser.status || 'Active'}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Joined On</span>
                <span className="text-slate-800 dark:text-slate-200">
                  {selectedUser.createdAt !== "N/A" ? new Date(selectedUser.createdAt!).toLocaleString() : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast Notification */}
      {pendingDeleteUser && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 dark:bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-bounce-short border border-slate-700 dark:border-slate-800">
            <span className="text-sm font-medium">User <b>{pendingDeleteUser.name}</b> removed.</span>
            <div className="w-px h-4 bg-slate-600"></div>
            <button 
                onClick={handleUndo}
                className="text-emerald-400 font-bold hover:text-emerald-300 text-sm uppercase tracking-wide transition-colors"
            >
                Undo
            </button>
        </div>
      )}

      {/* Simple Animation for Toast */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounceShort {
            0%, 100% { transform: translate(-50%, 0); }
            50% { transform: translate(-50%, -5px); }
        }
        .animate-bounce-short {
            animation: bounceShort 0.5s ease-in-out;
        }
      `}} />

    </div>
  );
}