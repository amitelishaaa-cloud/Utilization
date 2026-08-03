'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import DateRange from '@/components/ui/date-range'
import { PriorityBadge, NotesIcon } from '@/components/ui/meta-cells'
import { deleteProjectAction } from '@/app/(app)/projects/actions'
import type { Project, ProjectStatus } from '@/lib/types'

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'פעיל',
  completed: 'הושלם',
  cancelled: 'בוטל',
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function ProjectsTable({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-gray-500 text-sm mb-4">עדיין אין פרויקטים.</p>
        <Link
          href="/projects/new"
          className="inline-flex px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          הוסף פרויקט ראשון
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">שם פרויקט</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">לקוח</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">סטטוס</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">עדיפות</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">תאריכים</th>
            <th className="text-start px-4 py-3 text-sm font-medium text-gray-600">תמחור</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProjectRow({ project }: { project: Project }) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteProjectAction(project.id)
    })
  }

  const pricingLabel =
    project.pricing_type === 'hourly'
      ? `₪${project.hourly_rate}/ש'`
      : `₪${project.fixed_price} קבוע`


  return (
    <>
      <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <span className="inline-flex items-center gap-1.5">
            {project.name}
            <NotesIcon notes={project.notes} />
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{project.clients?.name ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </td>
        <td className="px-4 py-3">
          <PriorityBadge priority={project.priority} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          <DateRange start={project.start_date} end={project.end_date} />
          {project.is_end_date_estimated && ' (משוער)'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{pricingLabel}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/projects/${project.id}/edit`}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              עריכה
            </Link>
            <button
              onClick={() => setShowDialog(true)}
              disabled={isPending}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isPending ? 'מוחק...' : 'מחק'}
            </button>
          </div>
        </td>
      </tr>
      {showDialog && (
        <ConfirmDialog
          title="מחיקת פרויקט"
          description={`האם אתה בטוח שברצונך למחוק את הפרויקט "${project.name}"? פעולה זו אינה הפיכה.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDialog(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}
