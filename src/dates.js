export const pad=n=>String(n).padStart(2,'0');export const dateKey=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');export function calendarDays(month){const y=month.getFullYear(),m=month.getMonth(),start=(new Date(y,m,1).getDay()+6)%7,count=new Date(y,m+1,0).getDate();return [...Array(start).fill(null),...Array.from({length:count},(_,i)=>dateKey(new Date(y,m,i+1)))]}export const SHIFT_NAMES=['Frühdienst','Spätdienst','Zwischendienst','Nachtdienst','SG-Tag','Urlaub','Fortbildung'];export function shiftTimes(name){return {Frühdienst:['06:00','14:12'],Spätdienst:['13:30','21:42'],Zwischendienst:['11:48','20:00'],Nachtdienst:['21:15','06:30'], 'SG-Tag':['',''],Urlaub:['',''],Fortbildung:['','']}[name]||['','']}
export function nextShiftCaptureDate(currentDate, displayedMonth) {
  const next = new Date(currentDate + 'T12:00:00');
  next.setDate(next.getDate() + 1);
  if (next.getFullYear() !== displayedMonth.getFullYear() || next.getMonth() !== displayedMonth.getMonth()) return null;
  return dateKey(next);
}

export function changedShift(previous, {date, title, ownerId, owner, start, end}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SHIFT_NAMES.includes(title) || !ownerId) {
    throw new Error('Ungültige Dienstdaten');
  }
  const defaults = shiftTimes(title);
  return {...previous, date, title, ownerId, owner,
    start: start === (previous.start || '') ? defaults[0] : start,
    end: end === (previous.end || '') ? defaults[1] : end};
}
