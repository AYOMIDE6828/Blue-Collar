"use client";

import Link from "next/link";
import { Briefcase, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: "bg-gray-100 text-gray-500" },
  normal: { label: "Normal", color: "bg-blue-50 text-blue-600" },
  urgent: { label: "Urgent", color: "bg-red-50 text-red-600" },
};

export default function JobCard({ job }: { job: Job }) {
  const urg = URGENCY_LABEL[job.urgency] ?? URGENCY_LABEL.normal;
  const daysLeft = job.expiresAt
    ? Math.max(0, Math.ceil((new Date(job.expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900">{job.title}</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            {job.postedBy.firstName} {job.postedBy.lastName} · {job.category.name}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", urg.color)}>
          {urg.label}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-gray-600">{job.description}</p>

      {job.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {s}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
              +{job.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        {job.budget != null && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            {job.budget.toLocaleString()}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Briefcase size={12} />
          {job._count?.applications ?? 0} applicant{(job._count?.applications ?? 0) !== 1 ? "s" : ""}
        </span>
        {daysLeft !== null && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
          </span>
        )}
      </div>
    </Link>
  );
}
