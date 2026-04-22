import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, 'child'> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithElementRef<T extends Record<string, any> = Record<string, any>> = T & {
	ref?: T extends { ref?: infer R } ? R : HTMLElement | null;
};
