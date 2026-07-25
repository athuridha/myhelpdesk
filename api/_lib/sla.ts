export function calculateDueDate(
  priority: string,
  category: {
    slaCriticalHours: number
    slaHighHours: number
    slaMediumHours: number
    slaLowHours: number
  }
): Date {
  const hoursMap: Record<string, number> = {
    CRITICAL: category.slaCriticalHours ?? 4,
    HIGH: category.slaHighHours ?? 8,
    MEDIUM: category.slaMediumHours ?? 24,
    LOW: category.slaLowHours ?? 72,
  }
  const hours = hoursMap[priority] ?? 24
  const due = new Date()
  due.setHours(due.getHours() + hours)
  return due
}
