'use client';

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface NavItem {
  href?: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  section?: string;
  items?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
  title: string;
  color: string;
}

function isGroupItem(item: NavItem): boolean {
  return !!item.section && !!item.items;
}

export function Sidebar({ items, title, color }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNavItem = (item: NavItem, isNested?: boolean) => {
    if (!item.href || !item.title || !item.icon) return null;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          collapsed && !isNested && "justify-center",
          isActive
            ? "bg-amber-500 text-white shadow-md"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.title : undefined}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {(!collapsed || isNested) && <span>{item.title}</span>}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300",
          collapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-gray-200 px-4", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold", color)}>
                {title.charAt(0)}
              </div>
              <span className="font-semibold text-gray-900 text-sm">{title}</span>
            </div>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex">
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            if (isGroupItem(item)) {
              return (
                <div key={item.section} className={collapsed ? "flex flex-col items-center py-2" : "py-2"}>
                  {!collapsed && (
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {item.section}
                    </p>
                  )}
                  <div className={collapsed ? "flex flex-col items-center gap-1" : "space-y-0.5"}>
                    {item.items!.map((sub) => renderNavItem(sub, collapsed))}
                  </div>
                </div>
              );
            }
            return renderNavItem(item);
          })}
        </nav>
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4">
        <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="ml-3 font-semibold text-gray-900">{title}</span>
      </div>
    </>
  );
}
