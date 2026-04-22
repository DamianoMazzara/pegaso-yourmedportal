import { z } from 'zod';
import { isValidFiscalCodeFormat, normalizeFiscalCode } from '../lib/cf.js';

export const fiscalCodeZ = z
	.string()
	.min(1)
	.transform(normalizeFiscalCode)
	.refine(isValidFiscalCodeFormat, 'Codice fiscale non valido');
