type EmailKind =
	| 'booking_confirmed'
	| 'booking_cancelled'
	| 'report_created'
	| 'report_ready';

export function sendEmailStub(
	kind: EmailKind,
	to: string | null | undefined,
	payload: Record<string, unknown>
): void {
	if (!to) return;
	console.log(`[email:${kind}] to=${to}`, payload);
}
