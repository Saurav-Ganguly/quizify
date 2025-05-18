
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePlus, ListChecks, BarChart3 } from "lucide-react"; // Removed Zap, Settings
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "New Quiz", icon: FilePlus },
  { href: "/quizzes", label: "My Quizzes", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  // { href: "/settings", label: "Settings", icon: Settings }, // Future placeholder
];

export function SidebarNavLinks() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
            tooltip={item.label}
            className="justify-start w-full"
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
