<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getAdminToken, setAdminToken } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';

	let { children } = $props();

	const isLogin = $derived(page.url.pathname === '/admin/login');
	let guardReady = $state(false);

	const nav = [
		{ href: '/admin', label: 'Panoramica' },
		{ href: '/admin/prenotazioni', label: 'Prenotazioni' },
		{ href: '/admin/calendario', label: 'Calendario' },
		{ href: '/admin/macroaree', label: 'Macroaree' },
		{ href: '/admin/tipologie', label: 'Tipologie visita' },
		{ href: '/admin/referti', label: 'Referti' },
		{ href: '/admin/utenti', label: 'Utenti admin' },
		{ href: '/admin/log', label: 'Log attività' }
	];

	onMount(() => {
		const path = page.url.pathname;
		const token = getAdminToken();
		if (path === '/admin/login') {
			if (token) void goto('/admin');
			return;
		}
		if (!token) {
			void goto('/admin/login');
			return;
		}
		guardReady = true;
	});

	$effect(() => {
		if (!browser || isLogin) return;
		if (getAdminToken()) guardReady = true;
	});

	function logout() {
		setAdminToken(null);
		guardReady = false;
		void goto('/admin/login');
	}
</script>

{#if isLogin}
	<div class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
		<p class="mb-4 text-center text-sm text-muted-foreground">
			<Button variant="link" class="h-auto p-0" href="/">← Torna al sito pubblico</Button>
		</p>
		{@render children()}
	</div>
{:else if guardReady}
	<div class="flex flex-col gap-6 lg:flex-row">
		<aside class="shrink-0 lg:w-52">
			<p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Dashboard</p>
			<nav class="flex flex-col gap-1">
				{#each nav as item}
					<Button
						variant={page.url.pathname === item.href ? 'secondary' : 'ghost'}
						size="sm"
						class="justify-start"
						href={item.href}
					>
						{item.label}
					</Button>
				{/each}
			</nav>
			<Button class="mt-6 w-full" variant="outline" size="sm" type="button" onclick={logout}>
				Esci
			</Button>
		</aside>
		<div class="min-w-0 flex-1">
			{@render children()}
		</div>
	</div>
{:else}
	<p class="text-sm text-muted-foreground">Verifica accesso…</p>
{/if}
