import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserMenu } from "@/features/auth";
import { ThemeToggle } from "@/shared/components";

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen max-h-screen flex-col bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="shrink-0 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-md z-40">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/ganttx.png"
              alt="Ganttx"
              width={32}
              height={32}
              className="size-7.5 rounded-lg object-contain transition-transform group-hover:scale-105"
              priority
            />
            <span className="font-bold tracking-tight text-text-primary text-base">
              Ganttx
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/"
              className="text-text-secondary transition-colors hover:text-text-primary"
            >
              Proyectos
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu user={session.user} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
