interface SlaCategory {
  slaCriticalHours: number
  slaHighHours: number
  slaMediumHours: number
  slaLowHours: number
}

export function calculateDueDate(priority: string, category: SlaCategory): Date {
  const hoursMap: Record<string, number> = {
    CRITICAL: category.slaCriticalHours,
    HIGH: category.slaHighHours,
    MEDIUM: category.slaMediumHours,
    LOW: category.slaLowHours,
  }
  const hours = hoursMap[priority] ?? category.slaMediumHours
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export function isOverdue(ticket: { status: string; dueDate: Date | null }): boolean {
  if (!ticket.dueDate) return false
  if (['SELESAI', 'DITUTUP', 'SPAM', 'TRASH'].includes(ticket.status)) return false
  return new Date() > ticket.dueDate
}
