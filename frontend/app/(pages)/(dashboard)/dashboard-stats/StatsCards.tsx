"use client";

import { useState, useEffect } from "react";
import { Users, UsersRound, CheckSquare, CalendarDays } from "lucide-react";
import { User } from "@/shared/types/user";
import { getMyJiraTasks } from "@/app/(pages)/jira/actions";
import { getCalendarEvents } from "@/app/(pages)/(dashboard)/calendar/actions";
import { JIRA_LIMITS, ANIMATION } from "@/lib/constants";

interface StatsCardsProps {
  employees: User[];
}

const getWeekBounds = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const isWithinRange = (dateStr: string, start: Date, end: Date) => {
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

export default function StatsCards({ employees: employeesInput }: StatsCardsProps) {
  const employees = employeesInput || [];
  const [animate, setAnimate] = useState(false);
  const [tasksDueThisWeek, setTasksDueThisWeek] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const { start, end } = getWeekBounds();
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    Promise.all([getMyJiraTasks(JIRA_LIMITS.TASKS_DEFAULT), getCalendarEvents(now, in30Days)])
      .then(([tasks, events]) => {
        setTasksDueThisWeek((tasks || []).filter((t) => t.due_date && isWithinRange(t.due_date, start, end)).length);
        setUpcomingEvents((events || []).filter((e) => e.type === "meeting").length);
      })
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  const uniqueSquads = new Set<string>();
  employees.forEach((emp) => {
    emp.squads?.forEach((squad) => uniqueSquads.add(squad.name));
  });
  const squadCount = uniqueSquads.size;

  return (
    <div
      className={`bg-theme-surface border border-theme-border overflow-hidden transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
    >
      <div className="grid grid-cols-2 grid-rows-2 h-full">
        <div className="p-4 border-r border-b border-theme-border flex items-center gap-3">
          <Users className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-theme-text-muted">Team Members</p>
            <p className="text-xl font-bold text-theme-text">
              <AnimatedNumber value={employees.length} animate={animate} />
            </p>
          </div>
        </div>

        <div className="p-4 border-b border-theme-border flex items-center gap-3">
          <UsersRound className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-theme-text-muted">Squads</p>
            <p className="text-xl font-bold text-theme-text">
              <AnimatedNumber value={squadCount} animate={animate} />
            </p>
          </div>
        </div>

        <div className="p-4 border-r border-theme-border flex items-center gap-3">
          <CheckSquare className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-theme-text-muted">Tasks This Week</p>
            <p className="text-xl font-bold text-theme-text">
              <AnimatedNumber value={tasksDueThisWeek} animate={animate} />
            </p>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-theme-text-muted">Events</p>
            <p className="text-xl font-bold text-theme-text">
              <AnimatedNumber value={upcomingEvents} animate={animate} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const AnimatedNumber = ({ value, animate }: { value: number; animate: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(0);
      return;
    }

    const duration = ANIMATION.COUNT_DURATION_MS;
    const steps = ANIMATION.COUNT_STEPS;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  return <>{displayValue}</>;
};
