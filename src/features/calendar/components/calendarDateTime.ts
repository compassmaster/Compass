export function localDateTimeToOffsetInstant(local: string, timeZone: string): string | null {
  const match = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/); if (!match) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); } catch { return null; }
  const [, y, m, d, h, minute] = match; const wallUtc = Date.UTC(+y, +m - 1, +d, +h, +minute);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' });
  const candidates: { instant:number; offset:number }[] = [];
  for (let offset=-840; offset<=840; offset+=15) { const instant=wallUtc-offset*60_000; const p=Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])); if (`${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`===`${y}-${m}-${d} ${h}:${minute}`) candidates.push({instant,offset}); }
  if (candidates.length!==1) return null; // Reject DST gaps and ambiguous folds.
  const {instant,offset}=candidates[0], sign=offset<0?'-':'+'; const absolute=Math.abs(offset);
  return `${new Date(instant+offset*60_000).toISOString().slice(0,16)}:00${sign}${String(Math.floor(absolute/60)).padStart(2,'0')}:${String(absolute%60).padStart(2,'0')}`;
}
export function instantToLocalDateTime(instant:string,timeZone:string):string { const f=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); const p=Object.fromEntries(f.formatToParts(new Date(instant)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
