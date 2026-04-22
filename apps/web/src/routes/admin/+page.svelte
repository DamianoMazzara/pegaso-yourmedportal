<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';

	let stats = $state<{
		bookingsTotal: number;
		bookingsTodayConfirmed: number;
		reportsPending: number;
		reportsReady: number;
	} | null>(null);
	let me = $state<{ name: string; email: string } | null>(null);

	onMount(async () => {
		try {
			const [s, u] = await Promise.all([api.admin.stats(), api.admin.me()]);
			stats = s;
			me = u;
		} catch (e) {
			toast.error('Sessione non valida o errore di rete');
			console.error(e);
		}
	});
</script>

<svelte:head>
	<title>Panoramica — Admin</title>
</svelte:head>

<h1 class="mb-2 text-2xl font-semibold tracking-tight">Panoramica</h1>
{#if me}
	<p class="mb-6 text-muted-foreground">Ciao, <span class="text-foreground">{me.name}</span> ({me.email})</p>
{/if}

{#if stats}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Prenotazioni totali</CardDescription>
				<CardTitle class="text-3xl tabular-nums">{stats.bookingsTotal}</CardTitle>
			</CardHeader>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Confermate oggi</CardDescription>
				<CardTitle class="text-3xl tabular-nums">{stats.bookingsTodayConfirmed}</CardTitle>
			</CardHeader>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Referti in attesa</CardDescription>
				<CardTitle class="text-3xl tabular-nums">{stats.reportsPending}</CardTitle>
			</CardHeader>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardDescription>Referti pronti</CardDescription>
				<CardTitle class="text-3xl tabular-nums">{stats.reportsReady}</CardTitle>
			</CardHeader>
		</Card>
	</div>
{:else}
	<p class="text-sm text-muted-foreground">Caricamento statistiche…</p>
{/if}
