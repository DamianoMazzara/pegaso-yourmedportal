import * as jose from 'jose';
import { adminUsers } from '../../db/schema.js';

export type AdminPayload = {
	sub: string;
	email: string;
	name: string;
};

const getSecret = () => {
	const s = process.env.JWT_SECRET;
	if (!s || s.length < 16) {
		throw new Error('JWT_SECRET must be set (min 16 chars)');
	}
	return new TextEncoder().encode(s);
};

export class AuthService {
	async signAdminToken(user: typeof adminUsers.$inferSelect): Promise<string> {
		const secret = getSecret();
		return new jose.SignJWT({
			email: user.email,
			name: user.name
		})
			.setProtectedHeader({ alg: 'HS256' })
			.setSubject(String(user.id))
			.setIssuedAt()
			.setExpirationTime('7d')
			.sign(secret);
	}

	async verifyAdminToken(token: string | undefined): Promise<AdminPayload | null> {
		if (!token) return null;
		try {
			const secret = getSecret();
			const { payload } = await jose.jwtVerify(token, secret);
			const sub = payload.sub;
			const email = payload.email;
			const name = payload.name;
			if (typeof sub !== 'string' || typeof email !== 'string' || typeof name !== 'string') {
				return null;
			}
			return { sub, email, name };
		} catch {
			return null;
		}
	}
}
