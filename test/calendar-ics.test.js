import test from 'node:test';
import assert from 'node:assert/strict';
import {eventsToIcs, parseIcs} from '../src/calendar-ics.js';

test('ICS export keeps all-day ranges and recurrence metadata', () => {
  const ics = eventsToIcs([
    {id: 'birthday-1', type: 'family', eventKind: 'birthday', title: 'Mia, Geburtstag', date: '2026-10-14', recurrence: 'yearly'},
    {id: 'trip-1', type: 'family', title: 'Kurzurlaub', date: '2026-10-20', endDate: '2026-10-22'},
  ], {now: new Date('2026-10-01T12:00:00Z')});

  assert.match(ics, /SUMMARY:Mia\\, Geburtstag/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261014/);
  assert.match(ics, /DTEND;VALUE=DATE:20261015/);
  assert.match(ics, /RRULE:FREQ=YEARLY/);
  assert.match(ics, /DTEND;VALUE=DATE:20261023/);
});

test('ICS round trip keeps overnight shifts and task completion', () => {
  const ics = eventsToIcs([
    {id: 'night-1', type: 'shift', title: 'Nachtdienst', date: '2026-10-14', start: '21:15', end: '06:30'},
    {id: 'task-1', type: 'family', eventKind: 'task', title: 'Ranzen packen', date: '2026-10-15', completed: true},
  ], {now: new Date('2026-10-01T12:00:00Z')});
  const restored = parseIcs(ics);

  assert.match(ics, /DTSTART;TZID=Europe\/Berlin:20261014T211500/);
  assert.match(ics, /DTEND;TZID=Europe\/Berlin:20261015T063000/);
  assert.deepEqual(restored, [
    {id: 'night-1@famschicht', type: 'shift', title: 'Nachtdienst', date: '2026-10-14', start: '21:15', end: '06:30'},
    {id: 'task-1@famschicht', type: 'family', title: 'Ranzen packen', date: '2026-10-15', start: '', end: '', eventKind: 'task', completed: true},
  ]);
});

test('ICS round trip keeps recurring task occurrence completion dates', () => {
  const ics = eventsToIcs([{
    id: 'task-repeat', type: 'family', eventKind: 'task', title: 'Müll rausstellen',
    date: '2026-10-12', recurrence: 'weekly', completed: false,
    completedDates: ['2026-10-19', '2026-10-26'],
  }]);
  const restored = parseIcs(ics);

  assert.match(ics, /X-FAMSCHICHT-COMPLETED-DATES:2026-10-19\\,2026-10-26/);
  assert.deepEqual(restored[0].completedDates, ['2026-10-19', '2026-10-26']);
  assert.equal(restored[0].recurrence, 'weekly');
});

test('ICS parser unfolds lines and maps supported categories', () => {
  const parsed = parseIcs([
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:external-1',
    'SUMMARY:Sport\\, Kinder',
    'CATEGORIES:SPORT',
    'DTSTART;TZID=Europe/Berlin:20261014T160000',
    'DTEND;TZID=Europe/Berlin:20261014T173000',
    'RRULE:FREQ=WEEKLY',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n'));

  assert.deepEqual(parsed[0], {
    id: 'external-1', type: 'family', title: 'Sport, Kinder', date: '2026-10-14',
    start: '16:00', end: '17:30', recurrence: 'weekly', eventKind: 'sport',
  });
});
