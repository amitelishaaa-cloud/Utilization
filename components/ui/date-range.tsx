import { formatDate } from '@/lib/utils'

// Date ranges are LTR content. Inside the app's RTL layout the bidi algorithm
// treats both dates as numbers and reorders them, showing the end date first —
// the dir attribute isolates the pair so start always renders before end.
export default function DateRange({
  start,
  end,
  openLabel = 'פתוח',
}: {
  start: string
  end: string | null
  openLabel?: string
}) {
  return (
    <span dir="ltr">
      {formatDate(start)} – {end ? formatDate(end) : openLabel}
    </span>
  )
}
