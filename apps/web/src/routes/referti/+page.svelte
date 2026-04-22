<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { api } from '$lib/api';
	import { toast } from 'svelte-sonner';

	let fiscalCode = $state('');
	let code = $state('');
	let loading = $state(false);
	let result = $state<{
		status: string;
		code: string;
		examDate: string;
		visitTypeName: string;
		firstName: string;
		lastName: string;
		notes: string | null;
		attachments: { id: number; name: string; mimeType: string; downloadUrl: string }[];
	} | null>(null);

	async function submit(e: Event) {
		e.preventDefault();
		loading = true;
		result = null;
		try {
			result = await api.public.getReport({ fiscalCode, code });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Referto non trovato';
			toast.error(msg);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Referti — YourMedPortal</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>Consulta referto</CardTitle>
		<CardDescription>Servono codice fiscale e codice referto (es. RF-*****).</CardDescription>
	</CardHeader>
	<CardContent class="space-y-6">
		<form class="max-w-md space-y-4" onsubmit={submit}>
			<div class="space-y-2">
				<Label for="cf">Codice fiscale</Label>
				<Input id="cf" class="font-mono uppercase" maxlength={16} bind:value={fiscalCode} required />
			</div>
			<div class="space-y-2">
				<Label for="c">Codice referto</Label>
				<Input id="c" class="font-mono uppercase" bind:value={code} required />
			</div>
			<Button type="submit" disabled={loading}>{loading ? 'Ricerca…' : 'Cerca'}</Button>
		</form>

		{#if result}
			<div class="rounded-lg border border-border p-4">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="font-semibold text-foreground">
						{result.firstName}
						{result.lastName}
					</h3>
					<Badge variant={result.status === 'ready' ? 'default' : 'secondary'}>
						{result.status === 'ready' ? 'Pronto' : 'In attesa'}
					</Badge>
				</div>
				<dl class="mt-3 grid gap-2 text-sm">
					<div><dt class="text-muted-foreground">Tipologia</dt><dd>{result.visitTypeName}</dd></div>
					<div><dt class="text-muted-foreground">Data esame</dt><dd>{new Date(result.examDate).toLocaleDateString('it-IT')}</dd></div>
					<div><dt class="text-muted-foreground">Codice</dt><dd class="font-mono">{result.code}</dd></div>
					{#if result.notes}
						<div><dt class="text-muted-foreground">Note</dt><dd>{result.notes}</dd></div>
					{/if}
				</dl>
				{#if result.status === 'ready' && result.attachments.length > 0}
					<p class="mt-4 text-sm font-medium">Allegati</p>
					<ul class="mt-2 space-y-2">
						{#each result.attachments as a}
							<li>
								<a
									href={a.downloadUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary underline-offset-4 hover:underline"
								>
									{a.name}
								</a>
								<span class="text-muted-foreground"> ({a.mimeType})</span>
							</li>
						{/each}
					</ul>
				{:else if result.status === 'ready'}
					<p class="mt-4 text-sm text-muted-foreground">Nessun allegato caricato.</p>
				{:else}
					<p class="mt-4 text-sm text-muted-foreground">
						Il referto non è ancora disponibile per il download.
					</p>
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>
