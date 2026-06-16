"use client";
import Image from "next/image";
import bgimg from "../components/assets/bg.png";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { name: "Login", href: "/login" },
  { name: "Sign Up", href: "/register" },  
  { name: "Fogrot Password", href: "/forgot-password" },
]

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
const pathname = usePathname();


  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-none font-sans dark:bg-none ">
      <Image src={bgimg} alt="Background Image" className="fixed w-100 h-60 object-cover -z-10 opacity-100 " />
      {navLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);
        return (
          <Link
            key = {link.name}
            href={link.href}
            className={`px-4 py-2 rounded ${
              isActive ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-800"
            } hover:bg-gray-400`}
          >
            {link.name}
          </Link>
        );
      })
    }

      {children}
    </div>
  );
}