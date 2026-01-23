"use client";

import { memo, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Users, GitBranch, Shield } from "lucide-react";
import { User } from "@/shared/types/user";
import { SelectionType, filterMembersByTeam } from "../types";
import Avatar from "@/shared/common/Avatar";
import Pagination from "@/shared/common/Pagination";
import { PAGINATION } from "@/lib/constants";
import {
  badgePrimaryHover,
  cardHover,
  widgetContainer,
  widgetFooter,
} from "@/lib/styles";
import { cn } from "@/lib/utils";

interface TeamMemberCardProps {
  member: User;
}

const TeamMemberCard = memo(function TeamMemberCard({
  member,
}: TeamMemberCardProps) {
  return (
    <div className={cn(cardHover, "flex flex-col p-3 bg-theme-elevated group")}>
      <Link href={`/employee/${member.id}`} className="flex items-center gap-3">
        <Avatar
          s3AvatarUrl={member.avatar_url}
          firstName={member.first_name}
          lastName={member.last_name}
          size="md"
          className="flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-theme-text group-hover:text-primary-400 truncate transition-colors">
              {member.first_name} {member.last_name}
            </span>
            {member.role === "admin" && (
              <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            {member.role === "supervisor" && (
              <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            )}
          </div>
          {member.title && (
            <p className="text-xs text-theme-text-muted truncate mt-0.5">
              {member.title}
            </p>
          )}
        </div>
      </Link>

      {member.squads && member.squads.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-theme-border">
          {member.squads.map((squad) => (
            <Link
              key={squad.id}
              href={`/teams?type=squad&id=${squad.id}`}
              className={badgePrimaryHover}
              onClick={(e) => e.stopPropagation()}
            >
              <Users className="w-2.5 h-2.5 mr-1" />
              {squad.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

interface TeamMembersWidgetProps {
  selectionType: SelectionType;
  selectedId: string;
  allUsers: User[];
  selectedLabel: string;
}

export default function TeamMembersWidget({
  selectionType,
  selectedId,
  allUsers,
  selectedLabel,
}: TeamMembersWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const members = useMemo(
    () => filterMembersByTeam(allUsers, selectionType, selectedId),
    [allUsers, selectionType, selectedId],
  );

  // Reset to page 1 when selection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectionType, selectedId]);

  // Sort members: supervisors first, then by name
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === "supervisor" && b.role !== "supervisor") return -1;
      if (a.role !== "supervisor" && b.role === "supervisor") return 1;
      return `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`,
      );
    });
  }, [members]);

  // Pagination
  const totalPages = Math.ceil(sortedMembers.length / PAGINATION.TEAM_MEMBERS);
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGINATION.TEAM_MEMBERS;
    return sortedMembers.slice(
      startIndex,
      startIndex + PAGINATION.TEAM_MEMBERS,
    );
  }, [sortedMembers, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className={widgetContainer}>
      <div className="px-6 py-4 border-b border-theme-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-theme-text">
            Team Members
          </h2>
          {members.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-900/50 text-primary-300">
              {members.length}
            </span>
          )}
        </div>
        <span className="text-sm text-theme-text-muted">{selectedLabel}</span>
      </div>

      {members.length === 0 ? (
        <div className="flex-1 px-6 py-12 text-center text-theme-text-muted">
          <Users className="w-12 h-12 mx-auto mb-4 text-theme-text-subtle" />
          <p>
            No members in this{" "}
            {selectionType === "squad" ? "squad" : "department"}
          </p>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 px-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      <div className={widgetFooter}>
        <Link
          href="/orgchart"
          className="text-sm text-primary-400 hover:underline flex items-center gap-1"
        >
          View org chart
          <GitBranch className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
