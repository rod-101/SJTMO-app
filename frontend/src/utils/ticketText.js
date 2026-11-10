import { useEffect, useState } from "react";
import { getPublicSettings } from "../services/api";

// Ticket header/footer text, editable by admins in System Settings.
// Fetched once per page load and cached; falls back to the defaults if the
// API is unreachable, so printing still works.
export const DEFAULT_TICKET_TEXT = {
  ticket_office_name: "San Jose Traffic Management Office",
  ticket_title: "Official Violation Ticket",
  ticket_footer: "Present this ticket when settling the violation.",
};

let cached = null;
let pending = null;

export function loadTicketText() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = getPublicSettings()
      .then((data) => {
        cached = { ...DEFAULT_TICKET_TEXT, ...data };
        return cached;
      })
      .catch(() => DEFAULT_TICKET_TEXT)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

// Call after an admin saves new text so this tab picks it up.
export function setTicketTextCache(data) {
  cached = { ...DEFAULT_TICKET_TEXT, ...data };
}

export function useTicketText() {
  const [text, setText] = useState(cached || DEFAULT_TICKET_TEXT);
  useEffect(() => {
    let alive = true;
    loadTicketText().then((t) => alive && setText(t));
    return () => {
      alive = false;
    };
  }, []);
  return text;
}
