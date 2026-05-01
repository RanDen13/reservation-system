import { Button } from "@/app/components/ui/button";
import { CalendarDays, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
      <Image
        src="/lcupBg.png"
        alt="La Consolacion University Philippines"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />
      <section className="relative z-10 flex min-h-screen items-center px-6 py-16 lg:px-20">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            LCUP SAPF Approval Flow
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Officer-only venue reservations with SAPF approval tracking.
          </h1>
          <p className="max-w-2xl text-lg text-white/80">
            View public venue availability, submit digital SAPF requests as an
            authorized officer, and follow approvals from adviser to university
            president.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/calendar">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                View Public Calendar
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login
              </Button>
            </Link>
          </div>
          <p className="text-sm text-white/60">
            Accounts are created by the super admin. Public self-registration is
            disabled.
          </p>
        </div>
      </section>
    </main>
  );
}
