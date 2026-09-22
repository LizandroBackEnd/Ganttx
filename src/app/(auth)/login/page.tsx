import { IconTimeline } from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/features/auth";

interface LoginPageProps {
  readonly searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  const { callbackUrl } = await searchParams;

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-2xl backdrop-blur-sm">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <IconTimeline className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Welcome to Ganttx
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Real-time collaborative project management and visual Gantt timelines.
          </p>
        </div>

        {/* Action */}
        <div className="flex flex-col gap-3">
          <GoogleSignInButton
            callbackUrl={callbackUrl ?? "/"}
            className="w-full justify-center border-border hover:bg-surface-elevated"
          />
        </div>

        {/* Security Footer Note */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Protected by Google OAuth and secure session tokens.
        </p>
      </div>
    </div>
  );
}
