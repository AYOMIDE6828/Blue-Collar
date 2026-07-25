"use client";

import { useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import JobCard from "@/components/JobCard";
import { useAuth } from "@/context/AuthContext";
import type { Job } from "@/types";

interface JobListingProps {
  jobs: Job[];
  loading: boolean;
  error: string | null;
}

export default function JobListing({ jobs, loading, error }: JobListingProps) {
  const { user } = useAuth();

  return (
    <>
      {error && (
        <p className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Briefcase size={40} className="mb-4 text-gray-300" />
          <p className="font-medium text-gray-500">No jobs found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters</p>
          {user && (
            <Link href="/jobs/new" className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <Plus size={15} /> Post the first job
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </>
  );
}
