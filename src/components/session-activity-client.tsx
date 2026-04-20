"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

const KEY = "devops_activity_session_logged";

/** Mencatat satu entri APP_SESSION per tab (dengan IP dari sisi server). */
export function SessionActivityClient() {
  const { status } = useSession();
  const done = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || done.current) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(KEY)) return;
    done.current = true;
    void fetch("/api/audit/session", { method: "POST" }).then((res) => {
      if (res.ok && typeof window !== "undefined") sessionStorage.setItem(KEY, "1");
    });
  }, [status]);

  return null;
}
