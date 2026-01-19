"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Calendar,
  UsersRound,
} from "lucide-react";
import { User } from "@/shared/types";
import { getDepartmentBgColor } from "@/lib/department-colors";

interface DashboardStatsProps {
  employees: User[];
}

interface DepartmentSegment {
  department: string;
  count: number;
  color: string;
  percentage: number;
}

interface SquadStat {
  name: string;
  count: number;
  segments: DepartmentSegment[];
}

export default function DashboardStats({ employees }: DashboardStatsProps) {
  const [animate, setAnimate] = useState(false);
  const [hoveredSquad, setHoveredSquad] = useState<string | null>(null);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate unique squads count (excluding "Unassigned")
  const uniqueSquads = new Set<string>();
  employees.forEach((emp) => {
    emp.squads?.forEach((squad) => uniqueSquads.add(squad.name));
  });
  const squadCount = uniqueSquads.size;

  // Calculate squad breakdown with department color
  // Group employees by squad, keeping track of the most common department for each squad
  const squadData = employees.reduce((acc, emp) => {
    const dept = emp.department || "Unknown";
    const squadList = emp.squads?.length > 0 ? emp.squads : [{ id: 0, name: "Unassigned" }];

    for (const squad of squadList) {
      const squadName = squad.name;
      if (!acc[squadName]) {
        acc[squadName] = { count: 0, departments: {} };
      }
      acc[squadName].count++;
      acc[squadName].departments[dept] = (acc[squadName].departments[dept] || 0) + 1;
    }

    return acc;
  }, {} as Record<string, { count: number; departments: Record<string, number> }>);

  const squadStats: SquadStat[] = Object.entries(squadData)
    .map(([name, data]) => {
      // Create segments for each department in this squad
      const segments: DepartmentSegment[] = Object.entries(data.departments)
        .map(([dept, count]) => ({
          department: dept,
          count,
          color: getDepartmentBgColor(dept),
          percentage: (count / data.count) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        name,
        count: data.count,
        segments,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Calculate department stats for the counter
  const departmentCount = new Set(employees.map(e => e.department).filter(Boolean)).size;

  // Calculate recent hires (last 90 days)
  const recentHires = employees.filter((e) => {
    if (!e.date_started) return false;
    const startDate = new Date(e.date_started);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return startDate >= ninetyDaysAgo;
  }).length;

  const maxSquadCount = Math.max(...squadStats.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Squad Breakdown */}
        <div
          className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          style={{ transitionDelay: "400ms" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <UsersRound className="w-5 h-5 text-theme-text-muted" />
            <h3 className="font-semibold text-theme-text">Squad Breakdown</h3>
          </div>

          <div className="space-y-3">
            {squadStats.slice(0, 6).map((squad, index) => (
              <div
                key={squad.name}
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredSquad(squad.name)}
                onMouseLeave={() => setHoveredSquad(null)}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm transition-colors ${hoveredSquad === squad.name
                          ? "text-theme-text font-medium"
                          : "text-theme-text-muted"
                        }`}
                    >
                      {squad.name}
                    </span>
                    {/* Show department breakdown on hover */}
                    {hoveredSquad === squad.name && squad.segments.length > 1 && (
                      <span className="text-xs text-theme-text-subtle">
                        {squad.segments.map(s => s.department).join(", ")}
                      </span>
                    )}
                    {hoveredSquad !== squad.name && (
                      <span className="text-xs text-theme-text-subtle">
                        {squad.segments[0]?.department}
                        {squad.segments.length > 1 && ` +${squad.segments.length - 1}`}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-theme-text-muted font-medium">
                    {squad.count}
                  </span>
                </div>
                <div className="h-2 bg-theme-muted overflow-hidden">
                  <div
                    className={`h-full flex transition-all duration-700 ease-out ${hoveredSquad === squad.name ? "opacity-100" : "opacity-80"
                      }`}
                    style={{
                      width: animate
                        ? `${(squad.count / maxSquadCount) * 100}%`
                        : "0%",
                      transitionDelay: `${500 + index * 100}ms`,
                    }}
                  >
                    {squad.segments.map((segment) => (
                      <div
                        key={segment.department}
                        className={`h-full ${segment.color}`}
                        style={{
                          width: `${segment.percentage}%`,
                        }}
                        title={`${segment.department}: ${segment.count}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {squadStats.length > 6 && (
              <p className="text-sm text-theme-text-subtle pt-2">
                +{squadStats.length - 6} more squads
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Total Employees */}
          <div
            className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "0ms" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-theme-text-muted">Team Members</p>
                <p className="text-2xl font-bold text-theme-text">
                  <AnimatedNumber value={employees.length} animate={animate} />
                </p>
              </div>
            </div>
          </div>

          {/* Squads */}
          <div
            className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
                <UsersRound className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-theme-text-muted">Squads</p>
                <p className="text-2xl font-bold text-theme-text">
                  <AnimatedNumber value={squadCount} animate={animate} />
                </p>
              </div>
            </div>
          </div>

          {/* Recent Hires */}
          <div
            className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-theme-text-muted">Recent Hires</p>
                <p className="text-2xl font-bold text-theme-text">
                  <AnimatedNumber value={recentHires} animate={animate} />
                </p>
              </div>
            </div>
          </div>

          {/* Departments */}
          <div
            className={`bg-theme-surface border border-theme-border p-6 transition-all duration-500 hover:shadow-lg hover:scale-[1.02] ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            style={{ transitionDelay: "300ms" }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-theme-text-muted">Departments</p>
                <p className="text-2xl font-bold text-theme-text">
                  <AnimatedNumber value={departmentCount} animate={animate} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animated number component
function AnimatedNumber({
  value,
  animate,
}: {
  value: number;
  animate: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(0);
      return;
    }

    const duration = 1000;
    const steps = 30;
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
}

