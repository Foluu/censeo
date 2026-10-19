"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronDown,
  EllipsisVertical,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import { logout } from "@/lib/actions/auth";
import type { UserProfile } from "@/lib/avatar";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";

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

function SidebarFooter({
  profile,
  onNavigate,
}: {
  profile: UserProfile;
  onNavigate?: () => void;
}) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Link
          href="/profile"
          onClick={onNavigate}
          title="Edit profile"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-opacity hover:opacity-80"
        >
          <UserAvatar
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            avatarColor={profile.avatarColor}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {profile.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
              {profile.role.toLowerCase()}
            </p>
          </div>
        </Link>
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

/** Avatar button (top right on phones/tablets) with profile + log out. */
function ProfileMenu({ profile }: { profile: UserProfile }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            avatarColor={profile.avatarColor}
            className="size-8 text-[11px]"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar
            name={profile.name}
            avatarUrl={profile.avatarUrl}
            avatarColor={profile.avatarColor}
            className="size-10 text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="py-2.5">
          <Link href="/profile">
            <UserRound className="size-4" /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5">
          <Link href="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          className="py-2.5"
          onSelect={() => startTransition(() => logout())}
        >
          <LogOut className="size-4" /> {pending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Thumb-reachable primary navigation for phones and small tablets. */
function BottomNav({ session }: { session: SessionPayload }) {
  const pathname = usePathname();
  // Products is admin-only, so staff get Customers in that slot.
  const tabs: { href: string; label: string; icon: NavItem["icon"] }[] = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/sales", label: "Sales", icon: ShoppingCart },
    { href: "/inventory", label: "Inventory", icon: Boxes },
    session.role === "ADMIN"
      ? { href: "/products", label: "Products", icon: Package }
      : { href: "/customers", label: "Customers", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-safe lg:hidden print:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {tabs.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-active"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon
                className={cn("size-5.5", active && "drop-shadow-[0_0_8px_var(--primary)]")}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({
  session,
  profile,
  majorProducts,
  children,
}: {
  session: SessionPayload;
  profile: UserProfile;
  majorProducts: MajorProduct[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = isActive(pathname, "/profile")
    ? "Profile"
    : (NAV_ITEMS.find((item) => isActive(pathname, item.href))?.label ?? "CountBook");

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar lg:flex print:hidden">
        <BrandMark />
        <SidebarNav session={session} majorProducts={majorProducts} />
        <SidebarFooter profile={profile} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        {/* Topbar */}
        <header className="glass pt-safe sticky top-0 z-30 border-x-0 border-t-0 print:hidden">
          <div className="flex h-14 items-center gap-2 px-2 sm:px-4 lg:h-16 lg:gap-4 lg:px-8">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="size-10 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <EllipsisVertical className="size-5" />
            </Button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold tracking-tight lg:text-lg">
                {title}
              </h1>
            </div>

            <ThemeToggle />
            <div className="pr-1 lg:hidden">
              <ProfileMenu profile={profile} />
            </div>
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
              <SidebarFooter profile={profile} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 pt-5 pb-bottom-nav lg:px-8 lg:py-8 print:p-0">
          {children}
        </main>
      </div>

      <BottomNav session={session} />
    </div>
  );
}
