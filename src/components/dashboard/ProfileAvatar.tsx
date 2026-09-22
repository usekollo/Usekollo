"use client";

import { UserRound } from "lucide-react";
import { useProfile } from "@/features/profile/hooks";
import { cn } from "@/lib/utils";

/**
 * The signed-in user's photo, falling back to a generic icon.
 *
 * Shared by the desktop and mobile headers and the profile page so there is
 * one definition of "what the avatar looks like" — the fallback, the circular
 * crop and the object-fit all have to agree, and previously each site had its
 * own copy.
 *
 * Reads through the ["profile"] query, which react-query dedupes, so rendering
 * this in the header costs nothing on pages that already load the profile and
 * one small cached GET on those that do not.
 */
export default function ProfileAvatar({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  const { data } = useProfile();
  const src = data?.avatarUrl;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-light text-primary",
        className,
      )}
    >
      {src ? (
        // A user-uploaded object-storage URL, capped at 2MB and immutably
        // cached. next/image would add nothing and would need remotePatterns
        // configured for the Supabase host.
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className={iconClassName} />
      )}
    </span>
  );
}
