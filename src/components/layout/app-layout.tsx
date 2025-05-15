
"use client";

import * as React from "react";
import Link from "next/link";
import { BrainCircuit, Menu } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SidebarNavLinks } from "./sidebar-nav-links";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [defaultOpen, setDefaultOpen] = React.useState(true);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedState = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sidebar_state="));
      if (storedState) {
        setDefaultOpen(storedState.split("=")[1] === "true");
      } else {
        // Default to closed on mobile, open on desktop
        setDefaultOpen(!isMobile);
      }
    }
  }, [isMobile]);


  return (
    <SidebarProvider defaultOpen={defaultOpen} onOpenChange={setDefaultOpen}>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10">
              <BrainCircuit className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">
              Quizify
            </h1>
          </Link>
        </SidebarHeader>
        <Separator className="mb-2" />
        <SidebarContent>
          <SidebarNavLinks />
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Quizify
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:hidden">
          <SidebarTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SidebarTrigger>
          <Link href="/" className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-primary">Quizify</h1>
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
