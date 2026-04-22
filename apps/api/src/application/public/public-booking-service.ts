import { newBookingCode } from '../../lib/codes.js';
import { sendEmailStub } from '../../lib/email.js';
import type { BookingRepository } from '../../infrastructure/repositories/booking-repository.js';
import type { MacroAreaRepository } from '../../infrastructure/repositories/macro-area-repository.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class PublicBookingService {
	constructor(
		private readonly visitTypes: VisitTypeRepository,
		private readonly macroAreas: MacroAreaRepository,
		private readonly bookings: BookingRepository
	) {}

	async createBooking(input: {
		visitTypeId: number;
		slotStartIso: string;
		firstName: string;
		lastName: string;
		fiscalCode: string;
		age: number;
		address: string;
		phone: string;
		email?: string;
	}) {
		const slotStart = new Date(input.slotStartIso);
		if (Number.isNaN(slotStart.getTime())) {
			throw new HttpError(400, 'Data/ora non valida');
		}
		const [vt] = await this.visitTypes.selectIdAndMacroAreaIdById(input.visitTypeId);
		if (!vt) {
			throw new HttpError(404, 'Tipologia non trovata');
		}
		const [ma] = await this.macroAreas.findById(vt.macroAreaId);
		if (!ma) {
			throw new HttpError(404, 'Macroarea non trovata');
		}
		const used = await this.bookings.countConfirmedAtMacroAreaSlot(ma.id, slotStart);
		if (used >= ma.parallelSlots) {
			throw new HttpError(409, 'Slot non più disponibile');
		}
		const code = newBookingCode();
		const email = input.email?.trim() ? input.email.trim() : null;
		await this.bookings.insert({
			code,
			fiscalCode: input.fiscalCode,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			age: input.age,
			address: input.address.trim(),
			phone: input.phone.trim(),
			email,
			visitTypeId: input.visitTypeId,
			slotStart,
			status: 'confirmed'
		});
		sendEmailStub('booking_confirmed', email, {
			code,
			slot: slotStart.toISOString()
		});
		return { code };
	}

	async cancelBooking(input: { fiscalCode: string; code: string }) {
		const normalizedCode = input.code.trim().toUpperCase();
		const [b] = await this.bookings.findByCodeAndFiscal(normalizedCode, input.fiscalCode);
		if (!b) {
			throw new HttpError(404, 'Prenotazione non trovata');
		}
		if (b.status === 'cancelled') {
			return { ok: true as const };
		}
		await this.bookings.setStatus(b.id, 'cancelled');
		sendEmailStub('booking_cancelled', b.email, { code: b.code });
		return { ok: true as const };
	}
}
