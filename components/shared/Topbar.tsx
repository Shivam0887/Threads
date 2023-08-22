"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { OrganizationSwitcher, SignOutButton, SignedIn } from "@clerk/nextjs";

const Topbar = () => {
  const router = useRouter();

  return (
    <nav className="topbar">
      <Link href="/" className="flex items-center gap-4">
        <Image
          src="/assets/logo.svg"
          width={28}
          height={28}
          alt="Threads logo"
        />
        <p className="text-heading3-bold text-light-1 max-xs:hidden">Threads</p>
      </Link>

      <div className="flex items-center gap-1">
        <div className="block sm:hidden">
          <SignedIn>
            <SignOutButton signOutCallback={() => router.push("/sign-in")}>
              <div className="flex cursor-pointer">
                <Image
                  src="/assets/logout.svg"
                  width={24}
                  height={24}
                  alt="logout"
                  title="Logout"
                />
              </div>
            </SignOutButton>
          </SignedIn>
        </div>
        <OrganizationSwitcher
          appearance={{
            elements: { organizationSwitcherTrigger: "py-2 px-4" },
          }}
        />
      </div>
    </nav>
  );
};

export default Topbar;
