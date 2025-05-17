
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus, ListChecks, BarChart3, Settings, Zap } from "lucide-react"; // Added Zap
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "New Quiz", icon: FilePlus },
  { href: "/quizzes", label: "My Quizzes", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/quick-quiz", label: "Quick Quiz", icon: Zap }, // New Quick Quiz link
  // { href: "/settings", label: "Settings", icon: Settings }, // Future placeholder
];

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
              tooltip={item.label}
              className="justify-start w-full"
            >
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
