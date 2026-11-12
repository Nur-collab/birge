const BISHKEK_TZ = 'Asia/Bishkek';

/** Дата в Бишкеке (YYYY-MM-DD), как её считает backend. */
export function localDateStr(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BISHKEK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
  date.setUTCDate(date.getUTCDate() + offsetDays);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
