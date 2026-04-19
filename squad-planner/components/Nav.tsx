'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',         label: 'Feed',     icon: '🃏' },
  { href: '/post',     label: 'Post',     icon: '➕' },
  { href: '/results',  label: 'Results',  icon: '📊' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 z-50">
      {LINKS.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-xs transition-colors ${
            pathname === link.href
              ? 'text-indigo-600 font-semibold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <span className="text-xl">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
