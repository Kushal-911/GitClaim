import Link from "next/link";

export default function login() {
  return (
    <div>
      
      <Link href="../dashboard">
      <h1 className="text-5xl font-bold text-black">Login</h1>
      </Link>
    </div>
  );
}