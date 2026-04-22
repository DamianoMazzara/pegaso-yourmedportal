declare global {
	interface Window {
		__YMP__?: { publicApiUrl: string };
	}
	namespace App {}
}

export {};
