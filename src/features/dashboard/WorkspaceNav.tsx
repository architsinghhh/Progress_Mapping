import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList,
  FileText,
  Home,
  Layers,
  Menu,
  Mountain,
  X,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { AJNHAWK_COMPANY_NAME, AJNHAWK_TAGLINE } from '@/shared/lib/branding'
import { AjnhawkLogo } from '@/shared/ui/AjnhawkLogo'
import { useAppStore, type WorkspaceTab } from '@/store/appStore'

const tabs: {
  id: WorkspaceTab
  label: string
  icon: typeof Home
}[] = [
  { id: 'overview', label: 'Home', icon: Home },
  { id: 'siteprep', label: 'Site Preparation', icon: Mountain },
  { id: 'progress', label: 'Construction Progress', icon: ClipboardList },
  { id: 'survey', label: 'Periodic Progress Monitoring', icon: Layers },
]

/** Hamburger in the top header — opens left workspace sidebar. */
export function WorkspaceNav() {
  const workspaceTab = useAppStore((s) => s.workspaceTab)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)
  const setSummaryOpen = useAppStore((s) => s.setSummaryOpen)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const go = (id: WorkspaceTab) => {
    setWorkspaceTab(id)
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(), 180)
  }

  const drawer = createPortal(
    <AnimatePresence>
      {open ? (
        <div className="workspace-drawer-root" role="presentation">
          <motion.button
            type="button"
            className="workspace-drawer__scrim"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />

          <motion.aside
            id={panelId}
            className="workspace-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace menu"
            initial={{ x: '-105%' }}
            animate={{ x: 0 }}
            exit={{ x: '-105%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 36, mass: 0.82 }}
          >
            <div className="workspace-drawer__brand">
              <AjnhawkLogo size="sm" className="workspace-drawer__logo" />
              <div>
                <p className="workspace-drawer__brand-name">{AJNHAWK_COMPANY_NAME}</p>
                <p className="workspace-drawer__brand-tag">{AJNHAWK_TAGLINE}</p>
              </div>
            </div>

            <nav className="workspace-drawer__nav" aria-label="Workspace sections">
              {tabs.map((tab, i) => {
                const Icon = tab.icon
                const isActive = tab.id === workspaceTab
                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    className={cn('workspace-drawer__link', isActive && 'is-active')}
                    aria-current={isActive ? 'page' : undefined}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.04, duration: 0.28 }}
                    onClick={() => go(tab.id)}
                  >
                    <Icon className="workspace-drawer__link-icon" strokeWidth={1.85} />
                    <span>{tab.label}</span>
                  </motion.button>
                )
              })}
            </nav>

            <div className="workspace-drawer__utils">
              <button
                type="button"
                className="workspace-drawer__link"
                onClick={() => {
                  setSummaryOpen(true)
                  setOpen(false)
                }}
              >
                <FileText className="workspace-drawer__link-icon" strokeWidth={1.85} />
                <span>Report</span>
              </button>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn('workspace-burger', open && 'is-open')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label="Open workspace menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" strokeWidth={2.25} /> : <Menu className="size-5" strokeWidth={2.25} />}
      </button>
      {drawer}
    </>
  )
}
