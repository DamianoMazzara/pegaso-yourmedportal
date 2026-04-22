<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { SearchableSelect } from '$lib/components/ui/searchable-select/index.js';
	import { toast } from 'svelte-sonner';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Macro = { id: number; name: string };
	type VisitType = {
		id: number;
		name: string;
		description: string | null;
		macroAreaId: number;
	};

	type DayCol = {
		date: string;
		slots: { startIso: string; available: boolean }[];
	};

	function toIsoDate(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function mondayOf(d: Date): string {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		const day = x.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		x.setDate(x.getDate() + diff);
		return toIsoDate(x);
	}

	let macroAreas = $state<Macro[]>([]);
	let visitTypes = $state<VisitType[]>([]);
	let macroAreaId = $state<string>('');
	let visitTypeId = $state<string>('');
	let weekStart = $state('');
	let weekData = $state<{ days: DayCol[]; slotDurationMinutes: number } | null>(null);
	let loadingWeek = $state(false);
	let slotIso = $state<string>('');
	let submitting = $state(false);
	let doneCode = $state<string | null>(null);

	let firstName = $state('');
	let lastName = $state('');
	let fiscalCode = $state('');
	let age = $state('');
	let address = $state('');
	let phone = $state('');
	let email = $state('');

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

	const weekdayShort = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

	const weekTitle = $derived.by(() => {
		if (!weekStart) return '';
		const a = new Date(weekStart + 'T12:00:00');
		const b = new Date(a);
		b.setDate(a.getDate() + 6);
		const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
		return `${a.toLocaleDateString('it-IT', opts)} – ${b.toLocaleDateString('it-IT', { ...opts, year: 'numeric' })}`;
	});

	const slotRowCount = $derived(
		weekData?.days.length ? Math.max(...weekData.days.map((d) => d.slots.length), 0) : 0
	);

	function timeLabel(iso: string): string {
		return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
	}

	function dayHeaderLabel(isoDate: string): string {
		const d = new Date(isoDate + 'T12:00:00');
		const wd = weekdayShort[(d.getDay() + 6) % 7];
		return `${wd} ${d.getDate()}`;
	}

	onMount(async () => {
		try {
			const [macros, visits] = await Promise.all([
				api.public.macroAreasList(),
				api.public.visitTypesList()
			]);
			macroAreas = macros;
			visitTypes = visits;
		} catch (e) {
			toast.error('Impossibile caricare macroaree e tipologie');
			console.error(e);
		}
		const t = new Date();
		t.setDate(t.getDate() + 1);
		weekStart = mondayOf(t);
	});

	$effect(() => {
		visitTypesForMacro;
		const ok = visitTypesForMacro.some((vt) => String(vt.id) === visitTypeId);
		if (!ok) {
			visitTypeId = '';
			slotIso = '';
			weekData = null;
		}
	});

	async function loadWeek() {
		const vt = Number(visitTypeId);
		if (!vt || !weekStart) {
			weekData = null;
			return;
		}
		loadingWeek = true;
		slotIso = '';
		try {
			weekData = await api.public.weekAvailability({ visitTypeId: vt, weekStart });
			const anyAvail = weekData.days.some((d) => d.slots.some((s) => s.available));
			if (!anyAvail && weekData.days.some((d) => d.slots.length > 0)) {
				toast.message('Nessuno slot libero in questa settimana');
			}
		} catch (e) {
			toast.error('Errore caricamento calendario');
			console.error(e);
			weekData = null;
		} finally {
			loadingWeek = false;
		}
	}

	$effect(() => {
		const vt = Number(visitTypeId);
		if (vt && weekStart) {
			void loadWeek();
		}
	});

	function prevWeek() {
		const d = new Date(weekStart + 'T12:00:00');
		d.setDate(d.getDate() - 7);
		weekStart = toIsoDate(d);
	}

	function nextWeek() {
		const d = new Date(weekStart + 'T12:00:00');
		d.setDate(d.getDate() + 7);
		weekStart = toIsoDate(d);
	}

	function goThisWeek() {
		weekStart = mondayOf(new Date());
	}

	async function submit(e: Event) {
		e.preventDefault();
		const vt = Number(visitTypeId);
		if (!macroAreaId || !vt || !slotIso) {
			toast.error('Seleziona macroarea, tipologia e uno slot nel calendario');
			return;
		}
		submitting = true;
		doneCode = null;
		try {
			const r = await api.public.createBooking({
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
			doneCode = r.code;
			toast.success('Prenotazione confermata');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Errore';
			toast.error(msg);
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Prenota — YourMedPortal</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>Prenota una prestazione</CardTitle>
		<CardDescription>
			Compila i campi. Riceverai un codice prenotazione <span class="font-mono">PN-*****</span> da conservare.
		</CardDescription>
	</CardHeader>
	<CardContent>
		{#if doneCode}
			<div class="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
				<p class="font-medium text-foreground">Prenotazione confermata</p>
				<p class="mt-1 text-sm text-muted-foreground">Il tuo codice è:</p>
				<p class="mt-2 font-mono text-xl font-semibold text-primary">{doneCode}</p>
				<Button class="mt-4" href="/">Torna alla home</Button>
			</div>
		{:else}
			<form class="space-y-6" onsubmit={submit}>
				<div class="grid gap-4 sm:grid-cols-2">
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
				</div>

				<div class="space-y-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<Label class="text-base">Settimana e orari</Label>
						<div class="flex flex-wrap items-center gap-1">
							<Button
								variant="outline"
								size="icon-sm"
								type="button"
								disabled={!visitTypeId}
								onclick={prevWeek}
								aria-label="Settimana precedente"
							>
								<ChevronLeftIcon class="size-4" />
							</Button>
							<Button
								variant="outline"
								size="icon-sm"
								type="button"
								disabled={!visitTypeId}
								onclick={nextWeek}
								aria-label="Settimana successiva"
							>
								<ChevronRightIcon class="size-4" />
							</Button>
							<Button variant="secondary" size="sm" type="button" disabled={!visitTypeId} onclick={goThisWeek}>
								Questa settimana
							</Button>
						</div>
					</div>
					{#if weekStart}
						<p class="text-sm font-medium capitalize text-foreground">{weekTitle}</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Legenda:
						<span class="ms-1 inline-block rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5">Libero</span>
						<span class="ms-2 inline-block rounded border border-border bg-muted/60 px-1.5 py-0.5">Occupato</span>
					</p>

					{#if !visitTypeId}
						<p class="text-sm text-muted-foreground">Seleziona una tipologia per vedere la griglia.</p>
					{:else if loadingWeek}
						<p class="text-sm text-muted-foreground">Caricamento calendario…</p>
					{:else if !weekData || slotRowCount === 0}
						<p class="text-sm text-muted-foreground">Nessuno slot in questa settimana.</p>
					{:else}
						<div
							class="max-h-[min(32rem,70vh)] overflow-auto rounded-xl border border-border bg-card shadow-sm"
							role="grid"
							aria-label="Slot prenotabili per settimana"
						>
							<div
								class="grid min-w-[640px]"
								style="grid-template-columns: 3.25rem repeat(7, minmax(0, 1fr));"
							>
								<div class="border-b border-r border-border bg-muted/40"></div>
								{#each weekData.days as day (day.date)}
									<div
										class="border-b border-r border-border bg-muted/40 px-1 py-2 text-center text-[0.7rem] font-medium leading-tight text-muted-foreground last:border-r-0 sm:text-xs"
									>
										{dayHeaderLabel(day.date)}
									</div>
								{/each}

								{#each { length: slotRowCount } as _, ri (ri)}
									<div
										class="border-b border-r border-border bg-muted/30 px-1 py-1 text-end text-[0.65rem] text-muted-foreground sm:text-xs"
									>
										{#if weekData.days[0]?.slots[ri]}
											{timeLabel(weekData.days[0].slots[ri].startIso)}
										{/if}
									</div>
									{#each weekData.days as day, di (day.date)}
										{@const slot = day.slots[ri]}
										<div
											class="border-b border-r border-border p-0.5 last:border-r-0 {!slot ? 'bg-muted/10' : ''}"
										>
											{#if slot}
												{#if slot.available}
													<button
														type="button"
														class="h-full min-h-9 w-full rounded-md border border-primary/35 bg-primary/15 px-0.5 py-1 text-[0.65rem] font-medium text-primary transition hover:bg-primary/25 sm:text-xs {slotIso ===
														slot.startIso
															? 'ring-2 ring-primary ring-offset-1 ring-offset-card'
															: ''}"
														onclick={() => (slotIso = slot.startIso)}
													>
														<span class="sr-only">{timeLabel(slot.startIso)}</span>
														<span aria-hidden="true">Libero</span>
													</button>
												{:else}
													<div
														class="flex min-h-9 items-center justify-center rounded-md border border-border bg-muted/50 text-[0.65rem] text-muted-foreground sm:text-xs"
														aria-label="Occupato"
													>
														—
													</div>
												{/if}
											{/if}
										</div>
									{/each}
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="fn">Nome</Label>
						<Input id="fn" bind:value={firstName} required autocomplete="given-name" />
					</div>
					<div class="space-y-2">
						<Label for="ln">Cognome</Label>
						<Input id="ln" bind:value={lastName} required autocomplete="family-name" />
					</div>
					<div class="space-y-2">
						<Label for="cf">Codice fiscale</Label>
						<Input id="cf" bind:value={fiscalCode} required class="font-mono uppercase" maxlength={16} />
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
						<Input id="em" type="email" bind:value={email} autocomplete="email" />
					</div>
				</div>

				{#if slotIso}
					<p class="text-sm text-muted-foreground">
						Slot scelto:
						<span class="font-medium text-foreground">{new Date(slotIso).toLocaleString('it-IT')}</span>
					</p>
				{/if}

				<Button type="submit" disabled={submitting || !slotIso}>
					{submitting ? 'Invio…' : 'Conferma prenotazione'}
				</Button>
			</form>
		{/if}
	</CardContent>
</Card>
