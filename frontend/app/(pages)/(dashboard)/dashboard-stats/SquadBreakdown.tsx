"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { User } from "@/shared/types/user";
import Pagination from "@/shared/common/Pagination";
import { getDepartmentBgColor } from "@/lib/department-colors";
import { PAGINATION } from "@/lib/constants";

interface SquadBreakdownProps {
  employees: User[];
}

interface DepartmentSegment {
  department: string;
  count: number;
  color: string;
  percentage: number;
}

export default function SquadBreakdown({ employees: employeesInput }: SquadBreakdownProps) {
  const [animate, setAnimate] = useState(false);
  const [hoveredSquad, setHoveredSquad] = useState<string | null>(null);
  const [squadPage, setSquadPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const squadStats = useMemo(() => {
    const employees = employeesInput || [];
    const squadData = employees.reduce(
      (acc, emp) => {
        const dept = emp.department || "Unknown";
        const squadList = emp.squads?.length > 0 ? emp.squads : [{ id: 0, name: "Unassigned" }];

        for (const squad of squadList) {
          const squadName = squad.name;
          if (!acc[squadName]) {
            acc[squadName] = { id: squad.id, count: 0, departments: {} };
          }
          acc[squadName].count++;
          acc[squadName].departments[dept] = (acc[squadName].departments[dept] || 0) + 1;
        }

        return acc;
      },
      {} as Record<string, { id: number; count: number; departments: Record<string, number> }>
    );

    return Object.entries(squadData)
      .map(([name, data]) => {
        const segments: DepartmentSegment[] = Object.entries(data.departments)
          .map(([dept, count]) => ({
            department: dept,
            count,
            color: getDepartmentBgColor(dept),
            percentage: (count / data.count) * 100,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          id: data.id,
          name,
          count: data.count,
          segments,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [employeesInput]);

  const maxSquadCount = Math.max(...squadStats.map((s) => s.count), 1);
  const totalSquadPages = Math.ceil(squadStats.length / PAGINATION.SQUADS);
  const startIndex = (squadPage - 1) * PAGINATION.SQUADS;
  const paginatedSquads = squadStats.slice(startIndex, startIndex + PAGINATION.SQUADS);

  return (
    <div
      className={`bg-theme-surface border border-theme-border overflow-hidden flex flex-col transition-all duration-500 ${
        animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-theme-border flex items-center gap-2">
        <UsersRound className="w-4 h-4 text-primary-500 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-theme-text">Squad Breakdown</h2>
        {squadStats.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
            {squadStats.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 space-y-3">
        {paginatedSquads.map((squad, index) => {
          const SquadContent = (
            <div
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredSquad(squad.name)}
              onMouseLeave={() => setHoveredSquad(null)}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm transition-colors ${
                      hoveredSquad === squad.name
                        ? "text-theme-text font-medium"
                        : "text-theme-text-muted"
                    }`}
                  >
                    {squad.name}
                  </span>
                  {hoveredSquad === squad.name && squad.segments.length > 1 && (
                    <span className="text-xs text-theme-text-subtle">
                      {squad.segments.map((s) => s.department).join(", ")}
                    </span>
                  )}
                  {hoveredSquad !== squad.name && (
                    <span className="text-xs text-theme-text-subtle">
                      {squad.segments[0]?.department}
                      {squad.segments.length > 1 && ` +${squad.segments.length - 1}`}
                    </span>
                  )}
                </div>
                <span className="text-sm text-theme-text-muted font-medium">{squad.count}</span>
              </div>
              <div className="h-2 bg-theme-muted overflow-hidden">
                <div
                  className={`h-full flex transition-all duration-700 ease-out ${
                    hoveredSquad === squad.name ? "opacity-100" : "opacity-80"
                  }`}
                  style={{
                    width: animate ? `${(squad.count / maxSquadCount) * 100}%` : "0%",
                    transitionDelay: `${500 + index * 100}ms`,
                  }}
                >
                  {squad.segments.map((segment) => (
                    <div
                      key={segment.department}
                      className={`h-full ${segment.color}`}
                      style={{ width: `${segment.percentage}%` }}
                      title={`${segment.department}: ${segment.count}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          );

          if (squad.id === 0) {
            return <div key={squad.name}>{SquadContent}</div>;
          }

          return (
            <Link key={squad.name} href={`/teams?type=squad&id=${squad.id}`} className="block">
              {SquadContent}
            </Link>
          );
        })}
      </div>

      {totalSquadPages > 1 && (
        <Pagination
          currentPage={squadPage}
          totalPages={totalSquadPages}
          onPageChange={setSquadPage}
        />
      )}
    </div>
  );
}
