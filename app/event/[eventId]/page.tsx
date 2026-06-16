import { notFound } from "next/navigation";

function getRandomInt( count: number ) {
  return Math.floor(Math.random() * count);  
}

export default function EventDetails( { params, } : {
  params: { eventId: string };
} ) {
  const random = getRandomInt( 2);

  if ( random === 1 ) {
    throw new Error( "Failed to load event details." );
  }

  
  return(
    <div className="home-container flex flex-col items-center bg-black-500 font-sans dark:bg-white-900 min-h-screen text-color-gray-800">
      <h1 className="home-title text-5xl ">Welcome User</h1>
      <div className="Upcoming-container">
        <h2 className="Upcoming-title ">Upcoming Events</h2>       
        <h2 className="Upcoming-item">Event {params.eventId} - Date</h2>
      </div>
    </div>
  )
}
         