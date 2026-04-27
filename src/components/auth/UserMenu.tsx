import { LogIn, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

type UserMenuProps = {
  /** Apply slightly different palette when rendered on a dark surface. */
  isDark?: boolean;
};

const initialsFor = (name: string | null | undefined, email: string | null | undefined) => {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 1).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Header-mounted account menu. When signed out, renders a "Sign in" button
 * that opens the global sign-in modal. When signed in, renders an avatar
 * dropdown with the user's identity and a sign-out action.
 */
export const UserMenu = ({ isDark = true }: UserMenuProps) => {
  const { user, isLoading, isConfigured, requestSignIn, signOut } = useAuth();

  if (isLoading) {
    return (
      <div
        className={`h-8 w-20 animate-pulse rounded-full ${
          isDark ? "bg-slate-800" : "bg-slate-200"
        }`}
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => requestSignIn()}
        disabled={!isConfigured}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isDark
            ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-teal-500 hover:text-teal-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-600"
        }`}
        title={isConfigured ? "Sign in" : "Sign-in not configured"}
      >
        <LogIn size={14} />
        Sign in
      </button>
    );
  }

  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  const displayName = meta.full_name ?? meta.name ?? user.email ?? "Signed in";
  const avatarUrl = meta.avatar_url ?? meta.picture;
  const initials = initialsFor(meta.full_name ?? meta.name, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 rounded-full border p-1 pr-3 transition-colors ${
            isDark
              ? "border-slate-700 bg-slate-900 hover:border-teal-500"
              : "border-slate-200 bg-white hover:border-teal-500"
          }`}
          aria-label="Account menu"
        >
          <Avatar className="h-7 w-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-[10px] font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={`max-w-[120px] truncate text-xs font-semibold ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {meta.full_name ?? meta.name ?? user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{displayName}</span>
          {user.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
