export function calendarKeyboardOffset(key, date, calendarMode, viewportWidth) {
  const mobileMonthGrid = calendarMode === 'month' && viewportWidth <= 700;
  if (key === 'Home') {
    return (mobileMonthGrid ? -((date.getDate() - 1) % 2) : -((date.getDay() + 6) % 7)) || 0;
  }
  if (key === 'End') {
    return mobileMonthGrid
      ? Math.min(1 - ((date.getDate() - 1) % 2), new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() - date.getDate())
      : 6 - ((date.getDay() + 6) % 7);
  }

  const offsets = calendarMode === 'day'
    ? {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1}
    : {ArrowLeft: -1, ArrowRight: 1, ArrowUp: mobileMonthGrid ? -2 : -7, ArrowDown: mobileMonthGrid ? 2 : 7};
  return offsets[key] ?? null;
}
