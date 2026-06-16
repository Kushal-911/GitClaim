export default function Gallery() {
  return(
    <div className="home-container flex flex-col items-center bg-black-500 font-sans dark:bg-white-900 min-h-screen text-color-gray-800">
      <h1 className="home-title text-5xl ">Gallery</h1>
      <div className="content-container">
        <p className="content-text text-lg mt-4">We'll be adding photos soon. 
          Whom do you want to see in the gallery? Let us know!
        </p>
      </div>
    </div>
  )
}