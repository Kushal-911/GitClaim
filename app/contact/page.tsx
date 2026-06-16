export default function ContactUs() {
  return (
    <div className="home-container flex flex-col items-center bg-black-500 font-sans dark:bg-white-900 min-h-screen text-color-gray-800 w-full">
      <div className="content-container border-green-700 bg-teal-600 border-4 px-4 py-6 w-200 h-100 relative">
      <h1 className="home-title text-5xl">Contact Us</h1>
      <div className="content-container">
        <p className="content-text text-lg mt-4">We'd love to hear from you! Whether you have questions, feedback, or just want to say hello, feel free to reach out to us. You can contact us via email at <a href="mailto:L7K6w@example.com">L7K6w@example.com</a> or give us a call at <a href="tel:123-456-7890">123-456-7890</a>. We're here to help!</p>
      </div>
      </div>
    </div>
  )
}