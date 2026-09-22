"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { Button } from "@/shared/components/ui/button";
import { IconLogout } from "@tabler/icons-react";

export interface UserMenuProps {
  readonly user: {
    readonly name?: string | null;
    readonly email?: string | null;
    readonly image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps): React.JSX.Element {
  const initials = (user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "Avatar"}
            width={28}
            height={28}
            unoptimized
            className="size-7 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline text-xs font-medium text-text-primary">
          {user.name ?? user.email}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut({ redirectTo: "/login" })}
        className="text-xs text-text-muted hover:text-text-primary gap-1"
      >
        <IconLogout className="size-3.5" />
        <span>Sign Out</span>
      </Button>
    </div>
  );
}
