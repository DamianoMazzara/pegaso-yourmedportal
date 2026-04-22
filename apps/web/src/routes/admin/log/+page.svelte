<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';

	let rows = $state<
		{
			id: number;
			action: string;
			entityType: string;
			entityId: string | null;
			details: Record<string, unknown> | null;
			createdAt: string;
			adminEmail: string | null;
		}[]
	>([]);

	onMount(async () => {
		try {
			rows = await api.admin.activityLogsList({ limit: 200 });
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Errore');
		}
	});
</script>

<svelte:head>
	<title>Log attività — Admin</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Log attività</h1>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Data</TableHead>
				<TableHead>Operatore</TableHead>
				<TableHead>Azione</TableHead>
				<TableHead>Entità</TableHead>
				<TableHead>Dettagli</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each rows as r}
				<TableRow>
					<TableCell class="whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleString('it-IT')}</TableCell>
					<TableCell class="text-sm">{r.adminEmail ?? '—'}</TableCell>
					<TableCell class="font-mono text-xs">{r.action}</TableCell>
					<TableCell class="text-xs">
						{r.entityType}
						{r.entityId ? `#${r.entityId}` : ''}
					</TableCell>
					<TableCell class="max-w-xs truncate text-xs text-muted-foreground">
						{r.details ? JSON.stringify(r.details) : ''}
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
