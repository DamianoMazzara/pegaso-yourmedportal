import { customAlphabet } from 'nanoid';

const suffix = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 5);

export function newBookingCode(): string {
	return `PN-${suffix()}`;
}

export function newReportCode(): string {
	return `RF-${suffix()}`;
}
