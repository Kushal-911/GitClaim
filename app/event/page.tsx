import Link from "next/link";

export default function Event() {
  return(
    <div className="home-container flex flex-col items-center justify-between bg-black-500 font-sans dark:bg-white-900 min-h-screen text-color-gray-800">
      <h1 className="home-title">Welcome User</h1>
      <div className="Upcoming-container">
        <h2 className="Upcoming-title">Upcoming Events</h2>
        <Link href="/event/1">
          <h2 className="Upcoming-item">Event 1 - Date</h2>
        </Link>
        <Link href="/event/2">
          <h2 className="Upcoming-item">Event 2 - Date</h2>
        </Link>
        <Link href="/event/3">
          <h2 className="Upcoming-item">Event 3 - Date</h2>
        </Link>
        
      </div>
      <div className="Past-container">
        <h2 className="Past-title">Past Events</h2>
        <Link href="/event/A">
          <h2 className="Past-item">Event A - Date</h2>
        </Link>
        <Link href="/event/B">
          <h2 className="Past-item">Event B - Date</h2>
        </Link>
        <Link href="/event/C">
          <h2 className="Past-item">Event C - Date</h2>
        </Link>
      </div>
      
      
    </div>
  )
}