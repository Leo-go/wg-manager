"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TestSupabase() {
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    async function test() {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("servers").select("id").limit(1);
        if (error) throw error;
        setStatus("✅ Supabase connected! Tables are ready.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setStatus(`Error: ${message}`);
      }
    }
    void test();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border p-4 text-xl">{status}</div>
    </div>
  );
}
