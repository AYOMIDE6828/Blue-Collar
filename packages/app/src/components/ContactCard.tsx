"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Star } from "lucide-react";
import type { Worker } from "@/types";

interface ContactCardProps {
  contact: Worker;
  onContactClick?: (workerId: string) => void;
}

export default function ContactCard({ contact, onContactClick }: ContactCardProps) {
  const rating = contact.rating ?? 0;
  const reviewCount = contact.reviewCount ?? 0;

  const initials = useMemo(() => {
    const names = contact.name.split(" ");
    return names
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [contact.name]);

  const handleContact = () => {
    onContactClick?.(contact.id);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={contact.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-white font-semibold">
              {initials}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link href={`/workers/${contact.id}`} className="hover:underline">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {contact.name}
            </h3>
          </Link>

          {contact.category && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {contact.category.name}
            </p>
          )}

          {/* Rating */}
          {reviewCount > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < Math.floor(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                ({reviewCount})
              </span>
            </div>
          )}

          {/* Location */}
          {contact.location && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <MapPin size={14} />
              {contact.location}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 flex-col gap-2">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
              title="Email"
            >
              <Mail size={18} />
            </a>
          )}

          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors dark:text-gray-400 dark:hover:bg-gray-700"
              title="Call"
            >
              <Phone size={18} />
            </a>
          )}

          <button
            onClick={handleContact}
            className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 transition-colors"
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}
