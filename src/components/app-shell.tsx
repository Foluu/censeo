"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Star,
  Tags,
  Users,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

export type MajorProduct = { id: string; name: string; sku: string };

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

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Collapsible list of major products shown under "Products" in the sidebar. */
function ProductsSubmenu({
  majorProducts,
  onNavigate,
}: {
  majorProducts: MajorProduct[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/products", label: "All products", icon: LayoutGrid, exact: true },
    { href: "/products/categories", label: "Categories", icon: Tags, exact: false },
  ];

  return (
    <div className="ml-5 space-y-0.5 border-l border-sidebar-border py-1 pl-3">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <link.icon className="size-3.5 shrink-0" />
            {link.label}
          </Link>
        );
      })}

      <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
        <Star className="size-3" /> Major products
      </p>
      {majorProducts.length === 0 ? (
        <p className="px-2.5 pb-1 text-xs leading-relaxed text-sidebar-foreground/40">
          Star a product to pin it here.
        </p>
      ) : (
        majorProducts.map((product) => {
          const href = `/products/${product.id}`;
          return (
            <Link
              key={product.id}
              href={href}
              onClick={onNavigate}
              title={`${product.name} (${product.sku})`}
              className={cn(
                "block truncate rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                pathname === href
                  ? "bg-sidebar-accent font-medium text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {product.name}
            </Link>
          );
        })
      )}
    </div>
  );
}

function SidebarNav({
  session,
  majorProducts,
  onNavigate,
}: {
  session: SessionPayload;
  majorProducts: MajorProduct[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !item.adminOnly || session.role === "ADMIN"
  );
  const [productsOpen, setProductsOpen] = useState(() =>
    isActive(pathname, "/products")
  );

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const hasSubmenu = item.href === "/products";
        return (
          <div key={item.href}>
            <div className="relative flex items-center">
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
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
              {hasSubmenu && (
                <button
                  type="button"
                  onClick={() => setProductsOpen((open) => !open)}
                  aria-expanded={productsOpen}
                  aria-label={productsOpen ? "Collapse products" : "Expand products"}
                  className={cn(
                    "absolute right-1.5 z-10 flex size-7 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "text-sidebar-primary-foreground hover:bg-black/10"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform duration-200",
                      productsOpen && "rotate-180"
                    )}
                  />
                </button>
              )}
            </div>
            {hasSubmenu && (
              <AnimatePresence initial={false}>
                {productsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ProductsSubmenu
                      majorProducts={majorProducts}
                      onNavigate={onNavigate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
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
        CountBook
      </span>
    </div>
  );
}

/** Thumb-reachable primary navigation for phones and small tablets. */
function BottomNav({
  session,
  onMore,
  moreOpen,
}: {
  session: SessionPayload;
  onMore: () => void;
  moreOpen: boolean;
}) {
  const pathname = usePathname();
  const isAdmin = session.role === "ADMIN";
  const left = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/sales", label: "Sales", icon: ShoppingCart },
  ];
  const right = [
    isAdmin
      ? { href: "/products", label: "Products", icon: Package }
      : { href: "/inventory", label: "Stock", icon: Boxes },
  ];

  const tab = (item: { href: string; label: string; icon: NavItem["icon"] }) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground active:text-foreground"
        )}
      >
        <item.icon className={cn("size-5.5", active && "drop-shadow-[0_0_8px_var(--primary)]")} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-safe lg:hidden print:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-2">
        {left.map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/sales?new=1"
            aria-label="New sale"
            className="-mt-7 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-500/30 ring-4 ring-background transition-transform active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </Link>
        </div>
        {right.map(tab)}
        <button
          type="button"
          onClick={onMore}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
            moreOpen ? "text-primary" : "text-muted-foreground active:text-foreground"
          )}
        >
          <Menu className="size-5.5" />
          More
        </button>
      </div>
    </nav>
  );
}

export function AppShell({
  session,
  majorProducts,
  children,
}: {
  session: SessionPayload;
  majorProducts: MajorProduct[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar lg:flex print:hidden">
        <BrandMark />
        <SidebarNav session={session} majorProducts={majorProducts} />
        <SidebarFooter session={session} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        {/* Topbar */}
        <header className="glass pt-safe sticky top-0 z-30 border-x-0 border-t-0 print:hidden">
          <div className="flex h-14 items-center gap-3 px-4 lg:h-16 lg:gap-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-md md:hidden">
              <Boxes className="size-4.5 text-amber-950" />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">
                {current?.label ?? "CountBook"}
              </h1>
            </div>

            <ThemeToggle />
          </div>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-72 border-sidebar-border bg-sidebar p-0 pt-safe pb-safe"
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <BrandMark />
              <SidebarNav
                session={session}
                majorProducts={majorProducts}
                onNavigate={() => setMobileOpen(false)}
              />
              <SidebarFooter session={session} />
            </div>
          </SheetContent>
        </Sheet>

        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pt-5 pb-bottom-nav lg:px-8 lg:py-8 print:p-0">
          {children}
        </main>
      </div>

      <BottomNav
        session={session}
        moreOpen={mobileOpen}
        onMore={() => setMobileOpen(true)}
      />
    </div>
  );
}
