<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
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
	let ok = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		loading = true;
		ok = false;
		try {
			await api.public.cancelBooking({
				fiscalCode,
				code
			});
			ok = true;
			toast.success('Prenotazione annullata');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Operazione non riuscita';
			toast.error(msg);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Annulla prenotazione — YourMedPortal</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>Annulla prenotazione</CardTitle>
		<CardDescription>Inserisci codice fiscale e codice prenotazione (es. PN-*****).</CardDescription>
	</CardHeader>
	<CardContent>
		{#if ok}
			<p class="text-sm text-muted-foreground">
				Lo slot è stato liberato. Riceverai un’email di conferma se avevi indicato un indirizzo.
			</p>
			<Button class="mt-4" href="/">Home</Button>
		{:else}
			<form class="max-w-md space-y-4" onsubmit={submit}>
				<div class="space-y-2">
					<Label for="cf">Codice fiscale</Label>
					<Input id="cf" class="font-mono uppercase" maxlength={16} bind:value={fiscalCode} required />
				</div>
				<div class="space-y-2">
					<Label for="c">Codice prenotazione</Label>
					<Input id="c" class="font-mono uppercase" bind:value={code} required />
				</div>
				<Button type="submit" variant="destructive" disabled={loading}>
					{loading ? 'Elaborazione…' : 'Annulla prenotazione'}
				</Button>
			</form>
		{/if}
	</CardContent>
</Card>
