import { newBookingCode } from '../../lib/codes.js';
import { sendEmailStub } from '../../lib/email.js';
import type { AdminPayload } from '../support/auth-service.js';
import type { ActivityLogger } from '../support/activity-logger.js';
import type { BookingRepository } from '../../infrastructure/repositories/booking-repository.js';
import type { MacroAreaRepository } from '../../infrastructure/repositories/macro-area-repository.js';
import type { VisitTypeRepository } from '../../infrastructure/repositories/visit-type-repository.js';
import { HttpError } from '../../rest/http-error.js';

export class AdminBookingService {
	constructor(
		private readonly bookings: BookingRepository,
		private readonly visitTypes: VisitTypeRepository,
		private readonly macroAreas: MacroAreaRepository,
		private readonly activity: ActivityLogger
	) {}

	list(
		input:
			| {
					status?: 'all' | 'confirmed' | 'cancelled';
					from?: string;
					to?: string;
					macroAreaId?: number;
					orderAsc?: boolean;
			  }
			| undefined
	) {
		return this.bookings.listAdmin(input);
	}

	async create(
		input: {
			visitTypeId: number;
			slotStartIso: string;
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email?: string;
		},
		admin: AdminPayload
	) {
		const slotStart = new Date(input.slotStartIso);
		const [vt] = await this.visitTypes.selectIdAndMacroAreaIdById(input.visitTypeId);
		if (!vt) throw new HttpError(404, 'Tipologia non trovata');
		const [ma] = await this.macroAreas.findById(vt.macroAreaId);
		if (!ma) throw new HttpError(404, 'Macroarea non trovata');
		const used = await this.bookings.countConfirmedAtMacroAreaSlot(ma.id, slotStart);
		if (used >= ma.parallelSlots) {
			throw new HttpError(409, 'Slot pieno');
		}
		const code = newBookingCode();
		const email = input.email?.trim() ? input.email.trim() : null;
		const id = await this.bookings.insert({
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
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'booking.create',
			entityType: 'booking',
			entityId: String(id),
			details: { code }
		});
		sendEmailStub('booking_confirmed', email, { code });
		return { id, code };
	}

	async cancel(input: { id: number }, admin: AdminPayload) {
		const [b] = await this.bookings.findById(input.id);
		if (!b) throw new HttpError(404, 'Prenotazione non trovata');
		await this.bookings.setStatus(input.id, 'cancelled');
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'booking.cancel',
			entityType: 'booking',
			entityId: String(input.id)
		});
		sendEmailStub('booking_cancelled', b.email, { code: b.code });
		return { ok: true as const };
	}

	async updatePatient(
		input: {
			id: number;
			firstName: string;
			lastName: string;
			fiscalCode: string;
			age: number;
			address: string;
			phone: string;
			email?: string;
		},
		admin: AdminPayload
	) {
		const email = input.email?.trim() ? input.email.trim() : null;
		await this.bookings.updatePatient(input.id, {
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			fiscalCode: input.fiscalCode,
			age: input.age,
			address: input.address.trim(),
			phone: input.phone.trim(),
			email
		});
		await this.activity.log({
			adminUserId: Number(admin.sub),
			action: 'booking.update_patient',
			entityType: 'booking',
			entityId: String(input.id)
		});
		return { ok: true as const };
	}
}
