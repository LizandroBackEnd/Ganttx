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
    <div className="relative w-full max-w-sm px-4">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="relative rounded-2xl border border-border/80 bg-surface/90 p-8 shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Top subtle accent gradient */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(0,242,142,0.2)]">
            <IconTimeline className="size-7" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-1 inline-block">
            Plataforma Colaborativa
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Bienvenido a <span className="text-gradient-emerald">Ganttx</span>
          </h1>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed">
            Gestión de proyectos en tiempo real y cronogramas de Gantt interactivos.
          </p>
        </div>

        {/* Action */}
        <div className="flex flex-col gap-3">
          <GoogleSignInButton
            callbackUrl={callbackUrl ?? "/"}
            className="w-full justify-center border-border hover:border-primary/40 hover:bg-surface-elevated transition-all"
          />
        </div>

        {/* Security Footer Note */}
        <p className="mt-6 text-center text-xs text-text-muted">
          Protegido mediante Google OAuth y sesiones encriptadas.
        </p>
      </div>
    </div>
  );
}
