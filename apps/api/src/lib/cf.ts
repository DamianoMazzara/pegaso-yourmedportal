const CF_RE = /^[A-Z0-9]{16}$/i;

export function normalizeFiscalCode(cf: string): string {
	return cf.trim().toUpperCase().replace(/\s/g, '');
}

export function isValidFiscalCodeFormat(cf: string): boolean {
	const n = normalizeFiscalCode(cf);
	return CF_RE.test(n);
}
