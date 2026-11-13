import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="label">404</p>
      <h1 className="mt-2 font-display text-3xl text-white">Page not found</h1>
      <Link to="/" className="btn-primary mt-8">
        Back to the map
      </Link>
    </div>
  )
}
