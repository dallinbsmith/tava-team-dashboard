import { getCurrentUserServer } from "@/lib/server-api";
import { CalendarPageClient } from "./CalendarPageClient";

export default async function CalendarPage() {
  const currentUser = await getCurrentUserServer();

  return <CalendarPageClient initialCurrentUser={currentUser} />;
}
