"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <aside className="hidden md:block">
      <div className="sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto pb-6">
        <nav className="flex flex-col gap-8">
          {navigation.map((group, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {group.title && (
                <h4 className="docs-sidebar-heading mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.24em]">
                  {group.title}
                </h4>
              )}
              {group.items.map((item) => {
                const itemHash = item.href.includes("#")
                  ? item.href.slice(item.href.indexOf("#"))
                  : "";
                const isActive =
                  pathname === "/"
                    ? itemHash
                      ? hash === itemHash
                      : hash === ""
                    : pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setHash(itemHash)}
                    className={cn(
                      "docs-sidebar-link rounded-lg px-2 py-1 text-[13px] leading-6 transition-colors",
                      isActive
                        ? "is-active"
                        : undefined
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
