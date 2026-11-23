'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronDown, LogIn, Menu, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { appNavItems } from './nav-items';

function Brand() {
  return (
    <Link
      className="flex items-center gap-3 rounded-xl text-base font-semibold tracking-tight text-slate-100"
      href="/"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-brand font-mono text-sm font-bold text-slate-950">
        {'{ }'}
      </span>
      Syntaxia
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Application" className="flex flex-col gap-1">
      {appNavItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active
                ? 'bg-brand/10 text-brand ring-1 ring-brand/20 ring-inset'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {active ? (
              <span aria-hidden className="size-1.5 rounded-full bg-brand" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-11 gap-2 rounded-full px-1.5 pr-2.5 sm:pr-3"
          variant="ghost"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-brand/15 text-xs font-semibold text-brand">
              G
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm text-slate-300 sm:inline">Guest</span>
          <ChevronDown aria-hidden className="size-3.5 text-slate-500" />
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block text-sm">Guest session</span>
          <span className="block text-xs font-normal text-muted-foreground">
            Authentication arrives in 0.5.0
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogIn aria-hidden className="size-4" />
          Sign in (soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/5 bg-[#050b1a] px-4 py-5 lg:flex">
      <Brand />
      <Separator className="my-5 bg-white/5" />
      <NavList />
      <div className="mt-auto space-y-4">
        <Separator className="bg-white/5" />
        <Link
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          href="/"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back to site
        </Link>
        <p className="px-3 text-[11px] leading-relaxed text-slate-600">
          MVP in progress
          <br />
          Target: v1.0.0
        </p>
      </div>
    </aside>
  );
}

function TopBar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const current = appNavItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-surface/80 px-4 backdrop-blur sm:px-6">
      <Sheet onOpenChange={onMobileOpenChange} open={mobileOpen}>
        <SheetTrigger asChild>
          <Button
            aria-label="Open navigation"
            className="size-11 lg:hidden"
            size="icon"
            variant="ghost"
          >
            <Menu aria-hidden className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          className="w-72 gap-0 border-white/10 bg-[#050b1a] p-0"
          side="left"
        >
          <SheetHeader className="border-b border-white/5 px-4 py-4 text-left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Application sections
            </SheetDescription>
            <Brand />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <NavList onNavigate={() => onMobileOpenChange(false)} />
          </div>
          <SheetFooter className="border-t border-white/5">
            <Link
              className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
              href="/"
              onClick={() => onMobileOpenChange(false)}
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Back to site
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <Brand />
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
          Workspace
        </span>
        <span aria-hidden className="text-slate-700">
          /
        </span>
        <span className="text-sm font-medium text-slate-300">
          {current?.label ?? 'Overview'}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Badge
          className="hidden border-brand/20 bg-brand/10 text-brand sm:inline-flex"
          variant="outline"
        >
          <Sparkles aria-hidden className="size-3" />
          MVP
        </Badge>
        <UserMenu />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
        href="#main-content"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <main
          className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
