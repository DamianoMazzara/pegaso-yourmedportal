<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { SearchableSelect } from '$lib/components/ui/searchable-select/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { BookingAdminRow as B } from '$lib/api';

	type Macro = { id: number; name: string };
	type VisitType = {
		id: number;
		name: string;
		description: string | null;
		macroAreaId: number;
	};

	let rows = $state<B[]>([]);
	let filter = $state<'all' | 'confirmed' | 'cancelled'>('all');

	let macroAreas = $state<Macro[]>([]);
	let visitTypes = $state<VisitType[]>([]);
	let macroAreaId = $state('');
	let visitTypeId = $state('');
	let dateStr = $state('');
	let slots = $state<string[]>([]);
	let slotIso = $state('');
	let loadingSlots = $state(false);
	let saving = $state(false);

	let firstName = $state('');
	let lastName = $state('');
	let fiscalCode = $state('');
	let age = $state('');
	let address = $state('');
	let phone = $state('');
	let email = $state('');

	let patientOpen = $state(false);
	let patientRow = $state<B | null>(null);
	let pFirst = $state('');
	let pLast = $state('');
	let pCf = $state('');
	let pAge = $state('');
	let pAddr = $state('');
	let pPhone = $state('');
	let pEmail = $state('');
	let savingPatient = $state(false);

	const visitTypesForMacro = $derived(
		macroAreaId
			? visitTypes.filter((vt) => vt.macroAreaId === Number(macroAreaId))
			: []
	);

	const macroItems = $derived(macroAreas.map((m) => ({ value: String(m.id), label: m.name })));
	const visitItems = $derived(
		visitTypesForMacro.map((vt) => ({
			value: String(vt.id),
			label: vt.name,
			keywords: vt.description ? [vt.description] : undefined
		}))
	);
	const slotItems = $derived(
		slots.map((s) => ({ value: s, label: new Date(s).toLocaleString('it-IT') }))
	);

	async function load() {
		rows = await api.admin.bookingsList({ status: filter });
	}

	onMount(async () => {
		try {
			const [macros, visits] = await Promise.all([
				api.admin.macroAreasList(),
				api.admin.visitTypesList()
			]);
			macroAreas = macros;
			visitTypes = visits;
		} catch (e) {
			toast.error('Errore caricamento macroaree / tipologie');
			console.error(e);
		}
		const t = new Date();
		t.setDate(t.getDate() + 1);
		dateStr = t.toISOString().slice(0, 10);
	});

	$effect(() => {
		filter;
		void load();
	});

	$effect(() => {
		visitTypesForMacro;
		const ok = visitTypesForMacro.some((vt) => String(vt.id) === visitTypeId);
		if (!ok) {
			visitTypeId = '';
			slotIso = '';
			slots = [];
		}
	});

	async function loadSlots() {
		const vt = Number(visitTypeId);
		if (!vt || !dateStr) return;
		loadingSlots = true;
		slotIso = '';
		try {
			const r = await api.public.availableSlots({ visitTypeId: vt, date: dateStr });
			slots = r.slots;
		} catch (e) {
			toast.error('Errore caricamento slot');
			console.error(e);
			slots = [];
		} finally {
			loadingSlots = false;
		}
	}

	$effect(() => {
		const vt = Number(visitTypeId);
		if (vt && dateStr) {
			void loadSlots();
		}
	});

	async function createBooking(e: Event) {
		e.preventDefault();
		const vt = Number(visitTypeId);
		if (!macroAreaId || !vt || !slotIso) {
			toast.error('Seleziona macroarea, tipologia, data e orario');
			return;
		}
		saving = true;
		try {
			const r = await api.admin.bookingCreate({
				visitTypeId: vt,
				slotStartIso: slotIso,
				firstName,
				lastName,
				fiscalCode,
				age: Number(age),
				address,
				phone,
				email: email.trim() || undefined
			});
			toast.success(`Prenotazione creata: ${r.code}`);
			firstName = '';
			lastName = '';
			fiscalCode = '';
			age = '';
			address = '';
			phone = '';
			email = '';
			slotIso = '';
			await load();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			saving = false;
		}
	}

	async function cancel(id: number) {
		if (!confirm('Annullare questa prenotazione?')) return;
		try {
			await api.admin.bookingCancel({ id });
			toast.success('Annullata');
			await load();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Errore');
		}
	}

	function openPatient(r: B) {
		patientRow = r;
		pFirst = r.firstName;
		pLast = r.lastName;
		pCf = r.fiscalCode;
		pAge = String(r.age);
		pAddr = r.address;
		pPhone = r.phone;
		pEmail = r.email ?? '';
		patientOpen = true;
	}

	function closePatient() {
		patientOpen = false;
		patientRow = null;
	}

	async function savePatient(e: Event) {
		e.preventDefault();
		if (!patientRow) return;
		savingPatient = true;
		try {
			await api.admin.bookingUpdatePatient({
				id: patientRow.id,
				firstName: pFirst.trim(),
				lastName: pLast.trim(),
				fiscalCode: pCf.trim(),
				age: Number(pAge),
				address: pAddr.trim(),
				phone: pPhone.trim(),
				email: pEmail.trim() || undefined
			});
			toast.success('Dati paziente aggiornati');
			closePatient();
			await load();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			savingPatient = false;
		}
	}
</script>

<svelte:head>
	<title>Prenotazioni — Admin</title>
</svelte:head>

<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<h1 class="text-2xl font-semibold">Prenotazioni</h1>
	<div class="flex gap-2">
		<Button size="sm" variant={filter === 'all' ? 'secondary' : 'outline'} onclick={() => (filter = 'all')}>
			Tutte
		</Button>
		<Button
			size="sm"
			variant={filter === 'confirmed' ? 'secondary' : 'outline'}
			onclick={() => (filter = 'confirmed')}
		>
			Confermate
		</Button>
		<Button
			size="sm"
			variant={filter === 'cancelled' ? 'secondary' : 'outline'}
			onclick={() => (filter = 'cancelled')}
		>
			Annullate
		</Button>
	</div>
</div>

<form class="mb-8 space-y-4 rounded-lg border border-border p-4" onsubmit={createBooking}>
	<p class="text-sm text-muted-foreground">Nuova prenotazione confermata (stessi slot del portale pubblico).</p>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="ma">Macroarea</Label>
			<SearchableSelect
				id="ma"
				bind:value={macroAreaId}
				name="macroAreaId"
				required
				items={macroItems}
				placeholder="Seleziona macroarea…"
				searchPlaceholder="Cerca macroarea…"
				commandLabel="Macroaree"
			/>
		</div>
		<div class="space-y-2">
			<Label for="vt">Tipologia visita</Label>
			<SearchableSelect
				id="vt"
				bind:value={visitTypeId}
				name="visitTypeId"
				required
				disabled={!macroAreaId}
				items={visitItems}
				placeholder={macroAreaId ? 'Seleziona tipologia…' : 'Prima scegli la macroarea'}
				searchPlaceholder="Cerca tipologia…"
				commandLabel="Tipologie"
			/>
		</div>
		<div class="space-y-2 sm:col-span-2">
			<Label for="dt">Data</Label>
			<Input id="dt" type="date" bind:value={dateStr} class="max-w-xs" required />
		</div>
		<div class="space-y-2 sm:col-span-2">
			<Label>Orario</Label>
			{#if loadingSlots}
				<p class="text-sm text-muted-foreground">Caricamento slot…</p>
			{:else if !visitTypeId}
				<p class="text-sm text-muted-foreground">Seleziona tipologia e data.</p>
			{:else if slots.length === 0}
				<p class="text-sm text-muted-foreground">Nessuno slot libero.</p>
			{:else}
				<SearchableSelect
					bind:value={slotIso}
					name="slotIso"
					required
					items={slotItems}
					placeholder="Scegli orario…"
					searchPlaceholder="Cerca orario…"
					commandLabel="Slot"
					class="max-w-md"
				/>
			{/if}
		</div>
		<div class="space-y-2">
			<Label for="fn">Nome</Label>
			<Input id="fn" bind:value={firstName} required />
		</div>
		<div class="space-y-2">
			<Label for="ln">Cognome</Label>
			<Input id="ln" bind:value={lastName} required />
		</div>
		<div class="space-y-2">
			<Label for="cf">Codice fiscale</Label>
			<Input id="cf" class="font-mono uppercase" maxlength={16} bind:value={fiscalCode} required />
		</div>
		<div class="space-y-2">
			<Label for="age">Età</Label>
			<Input id="age" type="number" min="0" max="130" bind:value={age} required />
		</div>
		<div class="space-y-2 sm:col-span-2">
			<Label for="addr">Residenza</Label>
			<Input id="addr" bind:value={address} required />
		</div>
		<div class="space-y-2">
			<Label for="ph">Telefono</Label>
			<Input id="ph" type="tel" bind:value={phone} required />
		</div>
		<div class="space-y-2">
			<Label for="em">Email (facoltativa)</Label>
			<Input id="em" type="email" bind:value={email} />
		</div>
	</div>
	<Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Crea prenotazione'}</Button>
</form>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Codice</TableHead>
				<TableHead>Paziente</TableHead>
				<TableHead>CF</TableHead>
				<TableHead>Prestazione</TableHead>
				<TableHead>Data/ora</TableHead>
				<TableHead>Stato</TableHead>
				<TableHead class="min-w-[12rem]"></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each rows as r}
				<TableRow>
					<TableCell class="font-mono text-xs">{r.code}</TableCell>
					<TableCell>{r.firstName} {r.lastName}</TableCell>
					<TableCell class="font-mono text-xs">{r.fiscalCode}</TableCell>
					<TableCell>{r.visitTypeName}</TableCell>
					<TableCell>{new Date(r.slotStart).toLocaleString('it-IT')}</TableCell>
					<TableCell>
						<Badge variant={r.status === 'confirmed' ? 'default' : 'secondary'}>
							{r.status === 'confirmed' ? 'Confermata' : 'Annullata'}
						</Badge>
					</TableCell>
					<TableCell>
						{#if r.status === 'confirmed'}
							<div class="flex flex-wrap gap-2">
								<Button size="sm" variant="secondary" type="button" onclick={() => openPatient(r)}>
									Modifica paziente
								</Button>
								<Button size="sm" variant="outline" type="button" onclick={() => cancel(r.id)}>
									Annulla
								</Button>
							</div>
						{/if}
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>

<Dialog.Root bind:open={patientOpen}>
	<Dialog.Content class="sm:max-w-lg" showCloseButton={true}>
		<Dialog.Header>
			<Dialog.Title>Modifica dati paziente</Dialog.Title>
			<Dialog.Description>Prenotazione {patientRow?.code}</Dialog.Description>
		</Dialog.Header>
		<form class="grid gap-3 sm:grid-cols-2" onsubmit={savePatient}>
			<div class="space-y-2">
				<Label for="pf">Nome</Label>
				<Input id="pf" bind:value={pFirst} required />
			</div>
			<div class="space-y-2">
				<Label for="pl">Cognome</Label>
				<Input id="pl" bind:value={pLast} required />
			</div>
			<div class="space-y-2 sm:col-span-2">
				<Label for="pcf">Codice fiscale</Label>
				<Input id="pcf" class="font-mono uppercase" maxlength={16} bind:value={pCf} required />
			</div>
			<div class="space-y-2">
				<Label for="pa">Età</Label>
				<Input id="pa" type="number" min="0" max="130" bind:value={pAge} required />
			</div>
			<div class="space-y-2 sm:col-span-2">
				<Label for="paddr">Residenza</Label>
				<Input id="paddr" bind:value={pAddr} required />
			</div>
			<div class="space-y-2">
				<Label for="pph">Telefono</Label>
				<Input id="pph" type="tel" bind:value={pPhone} required />
			</div>
			<div class="space-y-2">
				<Label for="pem">Email (facoltativa)</Label>
				<Input id="pem" type="email" bind:value={pEmail} />
			</div>
			<Dialog.Footer class="col-span-2 justify-end gap-2">
				<Button type="button" variant="outline" onclick={closePatient}>Chiudi</Button>
				<Button type="submit" disabled={savingPatient}>
					{savingPatient ? 'Salvataggio…' : 'Salva'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
