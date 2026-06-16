export default function loading() {
  return (
    <div className="loadingBar flex items-center justify-center h-screen bg-black-500 font-sans dark:bg-white-900 text-color-gray-800">
      <h1 className="loadingText text-3xl animate-pulse">Loading...</h1>
    </div>
  )
}