/** סכום בשקלים, מעוגל לשקל שלם — אלה הערכות, לא חשבוניות. */
export function formatCurrency(amount: number): string {
  return `₪${Math.round(amount).toLocaleString('he-IL')}`
}

export function formatDate(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(input)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
