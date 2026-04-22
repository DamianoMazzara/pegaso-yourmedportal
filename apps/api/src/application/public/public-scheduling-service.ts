import { listSlotStartsForDay, parseDayOnly } from '../../lib/calendar.js';
import type { BookingRepository } from '../../infrastructure/repositories/booking-repository.js';
import type { MacroAreaRepository } from '../../infrastructure/repositories/macro-area-repository.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class PublicSchedulingService {
	constructor(
		private readonly visitTypes: VisitTypeRepository,
		private readonly macroAreas: MacroAreaRepository,
		private readonly bookings: BookingRepository
	) {}

	async availableSlots(input: { visitTypeId: number; date: string }) {
		const [vt] = await this.visitTypes.selectIdAndMacroAreaIdById(input.visitTypeId);
		if (!vt) {
			throw new HttpError(404, 'Tipologia non trovata');
		}
		const [ma] = await this.macroAreas.findById(vt.macroAreaId);
		if (!ma) {
			throw new HttpError(404, 'Macroarea non trovata');
		}
		const day = parseDayOnly(input.date);
		const starts = listSlotStartsForDay(day, ma.slotDurationMinutes);
		const available: string[] = [];
		for (const slotStart of starts) {
			const used = await this.bookings.countConfirmedAtMacroAreaSlot(ma.id, slotStart);
			if (used < ma.parallelSlots) {
				available.push(slotStart.toISOString());
			}
		}
		return { slots: available };
	}

	async weekAvailability(input: { visitTypeId: number; weekStart: string }) {
		const [vt] = await this.visitTypes.selectIdAndMacroAreaIdById(input.visitTypeId);
		if (!vt) {
			throw new HttpError(404, 'Tipologia non trovata');
		}
		const [ma] = await this.macroAreas.findById(vt.macroAreaId);
		if (!ma) {
			throw new HttpError(404, 'Macroarea non trovata');
		}

		const weekStartDay = parseDayOnly(input.weekStart);
		const weekEndDay = new Date(weekStartDay);
		weekEndDay.setDate(weekStartDay.getDate() + 6);
		weekEndDay.setHours(23, 59, 59, 999);

		const usageRows = await this.bookings.getConfirmedCountsBySlotInRange(
			ma.id,
			weekStartDay,
			weekEndDay
		);

		const usedBySlotMs = new Map<number, number>();
		for (const row of usageRows) {
			usedBySlotMs.set(row.slotStart.getTime(), Number(row.c));
		}

		const days: {
			date: string;
			slots: { startIso: string; available: boolean }[];
		}[] = [];

		for (let i = 0; i < 7; i++) {
			const day = new Date(weekStartDay);
			day.setDate(weekStartDay.getDate() + i);
			const y = day.getFullYear();
			const mo = String(day.getMonth() + 1).padStart(2, '0');
			const d = String(day.getDate()).padStart(2, '0');
			const dateStr = `${y}-${mo}-${d}`;
			const starts = listSlotStartsForDay(day, ma.slotDurationMinutes);
			const slots = starts.map((slotStart) => {
				const used = usedBySlotMs.get(slotStart.getTime()) ?? 0;
				return {
					startIso: slotStart.toISOString(),
					available: used < ma.parallelSlots
				};
			});
			days.push({ date: dateStr, slots });
		}

		return { days, slotDurationMinutes: ma.slotDurationMinutes };
	}
}
