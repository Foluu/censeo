"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/products", label: "Products", icon: Package, adminOnly: true },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SidebarNav({
  session,
  onNavigate,
}: {
  session: SessionPayload;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || session.role === "ADMIN"
  );

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-sidebar-primary shadow-lg"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <item.icon className="relative z-10 size-4.5 shrink-0" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ session }: { session: SessionPayload }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-amber-950">
          {initials(session.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-sidebar-foreground">
            {session.name}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
            {session.role.toLowerCase()}
          </p>
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            title="Log out"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-6">
      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md">
        <Boxes className="size-5 text-amber-950" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
        Censeo
      </span>
    </div>
  );
}

export function AppShell({
  session,
  children,
}: {
  session: SessionPayload;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar lg:flex">
        <BrandMark />
        <SidebarNav session={session} />
        <SidebarFooter session={session} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Topbar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-4 border-x-0 border-t-0 px-4 lg:px-8">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 border-sidebar-border bg-sidebar p-0"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col">
                <BrandMark />
                <SidebarNav
                  session={session}
                  onNavigate={() => setMobileOpen(false)}
                />
                <SidebarFooter session={session} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {current?.label ?? "Censeo"}
            </h1>
          </div>

          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
