const WINDOWS: { startMin: number; endMin: number }[] = [
	{ startMin: 9 * 60, endMin: 14 * 60 },
	{ startMin: 16 * 60, endMin: 19 * 60 }
];

function atDateMinutes(base: Date, totalMinutes: number): Date {
	const d = new Date(base);
	d.setHours(0, 0, 0, 0);
	d.setMinutes(totalMinutes);
	return d;
}

export function listSlotStartsForDay(day: Date, slotDurationMinutes: number): Date[] {
	const out: Date[] = [];
	for (const w of WINDOWS) {
		for (let m = w.startMin; m + slotDurationMinutes <= w.endMin; m += slotDurationMinutes) {
			out.push(atDateMinutes(day, m));
		}
	}
	return out;
}

export function parseDayOnly(isoDate: string): Date {
	const [y, mo, d] = isoDate.split('-').map(Number);
	const dt = new Date(y, mo - 1, d);
	dt.setHours(0, 0, 0, 0);
	return dt;
}
