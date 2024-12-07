import { useState, useEffect, useRef } from 'react'
import { CommandIcon, SearchIcon, ExternalLinkIcon } from 'lucide-react'

const navigation = [
  { name: 'About Me', href: '#about-me', icon: '👨‍💻' },
  { name: 'Experience', href: '#work-experience', icon: '💼' },
  { name: 'Projects', href: '#projects', icon: '🚀' },
  { name: 'Skills', href: '#skills', icon: '🛠️' },
]

const social = [
  { name: 'GitHub', href: 'https://github.com/hiten36/', icon: '⌨️' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/hiten-khatri-63899b198/', icon: '💼' },
  { name: 'Twitter', href: 'https://x.com/Hiten17424005', icon: '🐦' },
  { name: 'Resume', href: './Hiten_Khatri-CV.pdf', icon: '📄' },
]

const actions = [
  { name: 'Copy Email', icon: '📧', action: () => {
    navigator.clipboard.writeText('hitenkhatri14@gmail.com')
  }},
]

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const paletteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((isOpen) => !isOpen)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const filteredItems = (items: any[]) =>
    query === ''
      ? items
      : items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="command-button fixed bottom-6 left-14 z-50 inline-flex items-center gap-2 rounded-lg bg-neutral-900/90 px-4 py-2 text-sm text-neutral-200 shadow-lg backdrop-blur hover:bg-neutral-800/90 hover:text-neutral-300 transition-colors"
      >
        <CommandIcon className="h-4 w-4 relative z-10" />
        <span className="font-medium relative z-10">Press ⌘K</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 pt-[25vh] bg-neutral-900/80 backdrop-blur-sm">
          <div
            ref={paletteRef}
            className="relative mx-auto max-w-xl w-full divide-y divide-neutral-800 overflow-hidden rounded-xl bg-neutral-900/90 shadow-2xl ring-1 ring-neutral-700/80 backdrop-blur"
          >
            <div className="flex items-center px-4">
              <SearchIcon className="h-5 w-5 text-neutral-400" />
              <input
                type="text"
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full border-0 bg-transparent pl-4 text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-0"
                placeholder="Search..."
              />
            </div>

            <div className="max-h-96 overflow-y-auto py-4 text-sm">
              {filteredItems(navigation).length > 0 && (
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-neutral-400">Navigation</div>
                  {filteredItems(navigation).map((item) => (
                    <div
                      key={item.name}
                      onClick={() => {
                        setIsOpen(false)
                        if (item.href.startsWith('#')) {
                          document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' })
                        } else {
                          window.open(item.href, '_blank')
                        }
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 hover:bg-neutral-800/50 hover:text-neutral-200 text-neutral-400"
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredItems(social).length > 0 && (
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-neutral-400">Social</div>
                  {filteredItems(social).map((item) => (
                    <div
                      key={item.name}
                      onClick={() => {
                        setIsOpen(false)
                        window.open(item.href, '_blank')
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 hover:bg-neutral-800/50 hover:text-neutral-200 text-neutral-400"
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                      <ExternalLinkIcon className="ml-auto h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}

              {filteredItems(actions).length > 0 && (
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-neutral-400">Actions</div>
                  {filteredItems(actions).map((item) => (
                    <div
                      key={item.name}
                      onClick={() => {
                        setIsOpen(false)
                        item.action()
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 hover:bg-neutral-800/50 hover:text-neutral-200 text-neutral-400"
                    >
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
