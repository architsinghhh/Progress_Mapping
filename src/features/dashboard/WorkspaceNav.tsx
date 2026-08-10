import { cn } from '@/shared/lib/utils'
import { useAppStore, type WorkspaceTab } from '@/store/appStore'
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Layers,
  Mountain,
} from 'lucide-react'

const tabs: { id: WorkspaceTab; label: string; hint: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', hint: 'Site plan & insights', icon: LayoutDashboard },
  { id: 'siteprep', label: 'Site Preparation', hint: 'Stage matrix, contours & cut-fill', icon: Mountain },
  { id: 'progress', label: 'Progress', hint: 'Gantt, floors & curves', icon: ClipboardList },
  { id: 'survey', label: 'Survey', hint: 'Then/Now ortho & DEM', icon: Layers },
  { id: 'model', label: '3D Model', hint: 'Orbit view & stage compare', icon: Boxes },
]

export function WorkspaceNav() {
  const workspaceTab = useAppStore((s) => s.workspaceTab)
  const setWorkspaceTab = useAppStore((s) => s.setWorkspaceTab)

  return (
    <nav className="workspace-nav" aria-label="Workspace sections">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = workspaceTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setWorkspaceTab(tab.id)}
            className={cn('workspace-nav__btn', active && 'is-active')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="min-w-0 text-left">
              <span className="block font-display text-[0.78rem] font-bold leading-tight">
                {tab.label}
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-slate-400 sm:block">
                {tab.hint}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
