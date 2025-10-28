"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugAuthPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const clearCookies = () => {
    addLog("Clearing all cookies...");

    // Clear all Supabase cookies
    const cookies = document.cookie.split(";");
    cookies.forEach((cookie) => {
      const [name] = cookie.split("=");
      if (name.trim().includes("sb-")) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        addLog(`Cleared cookie: ${name.trim()}`);
      }
    });

    addLog("Cookies cleared!");
  };

  const checkAuth = async () => {
    addLog("Checking authentication...");

    try {
      const supabase = createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        addLog(`Error: ${error.message}`);
      } else if (user) {
        addLog(`User found: ${user.id}`);
        addLog(`Email: ${user.email}`);
      } else {
        addLog("No user found");
      }
    } catch (err) {
      addLog(`Exception: ${err}`);
    }
  };

  const signOut = async () => {
    addLog("Signing out...");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        addLog(`Sign out error: ${error.message}`);
      } else {
        addLog("Signed out successfully");
      }
    } catch (err) {
      addLog(`Sign out exception: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Debug Authentication
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={clearCookies}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear Cookies
            </button>
            <button
              onClick={checkAuth}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Check Auth
            </button>
            <button
              onClick={signOut}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
