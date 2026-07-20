import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          WG Manager
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Deploy and manage WireGuard VPN servers on your VPS infrastructure.
          Simple, fast, and secure.
        </p>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
