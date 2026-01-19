import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserByIdServer, getCurrentUserServer } from "@/lib/server-api";
import { EmployeePageClient } from "./EmployeePageClient";

interface EmployeePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeePage({ params }: EmployeePageProps) {
  const { id } = await params;
  const employeeId = parseInt(id, 10);

  if (isNaN(employeeId)) {
    notFound();
  }

  try {
    const [employee, currentUser] = await Promise.all([
      getUserByIdServer(employeeId),
      getCurrentUserServer(),
    ]);

    return <EmployeePageClient employee={employee} currentUser={currentUser} />;
  } catch (error) {
    // Check if it's a 404
    if (error instanceof Error && error.message.includes("not found")) {
      return (
        <div className="max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-theme-text-muted hover:text-theme-text mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-yellow-900/30 border border-yellow-500/30 p-4">
            <p className="text-yellow-300">Employee not found.</p>
          </div>
        </div>
      );
    }

    // Re-throw other errors to be handled by error boundary
    throw error;
  }
}
