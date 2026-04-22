<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { SearchableSelect } from '$lib/components/ui/searchable-select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	type Macro = { id: number; name: string };
	type B = {
		id: number;
		code: string;
		fiscalCode: string;
		firstName: string;
		lastName: string;
		phone: string;
		email: string | null;
		slotStart: string;
		status: string;
		visitTypeName: string;
	};

	function toIsoDate(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function localDateKeyFromIso(iso: string): string {
		return toIsoDate(new Date(iso));
	}

	function monthRange(year: number, monthIndex: number): { from: string; to: string } {
		const from = new Date(year, monthIndex, 1);
		const to = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
		return { from: toIsoDate(from), to: toIsoDate(to) };
	}

	function calendarCells(year: number, monthIndex: number): { date: Date; inMonth: boolean }[] {
		const first = new Date(year, monthIndex, 1);
		const start = new Date(first);
		const dow = first.getDay();
		const mondayOffset = dow === 0 ? -6 : 1 - dow;
		start.setDate(first.getDate() + mondayOffset);
		const cells: { date: Date; inMonth: boolean }[] = [];
		for (let i = 0; i < 42; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			cells.push({ date: d, inMonth: d.getMonth() === monthIndex });
		}
		return cells;
	}

	let macros = $state<Macro[]>([]);
	let macroAreaId = $state<string>('');
	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());
	let rows = $state<B[]>([]);
	let loading = $state(false);
	let detailOpen = $state(false);
	let selected = $state<B | null>(null);
	let dayListBookings = $state<B[] | null>(null);

	const macroItems = $derived(macros.map((m) => ({ value: String(m.id), label: m.name })));
	const cells = $derived(calendarCells(viewYear, viewMonth));
	const monthTitle = $derived(
		new Date(viewYear, viewMonth, 1).toLocaleDateString('it-IT', {
			month: 'long',
			year: 'numeric'
		})
	);

	const byDay = $derived.by(() => {
		const m = new Map<string, B[]>();
		for (const r of rows) {
			const k = localDateKeyFromIso(r.slotStart);
			const arr = m.get(k) ?? [];
			arr.push(r);
			m.set(k, arr);
		}
		for (const arr of m.values()) {
			arr.sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());
		}
		return m;
	});

	const weekdayLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

	async function loadBookings() {
		const ma = Number(macroAreaId);
		if (!ma) {
			rows = [];
			return;
		}
		loading = true;
		try {
			const { from, to } = monthRange(viewYear, viewMonth);
			rows = await api.admin.bookingsList({
				status: 'confirmed',
				from,
				to,
				macroAreaId: ma,
				orderAsc: true
			});
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Errore');
			rows = [];
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			const list = await api.admin.macroAreasList();
			macros = list.map((x) => ({ id: x.id, name: x.name }));
		} catch (e) {
			toast.error('Impossibile caricare le macroaree');
			console.error(e);
		}
	});

	$effect(() => {
		macroAreaId;
		viewYear;
		viewMonth;
		void loadBookings();
	});

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear -= 1;
		} else {
			viewMonth -= 1;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear += 1;
		} else {
			viewMonth += 1;
		}
	}

	function goToday() {
		const n = new Date();
		viewYear = n.getFullYear();
		viewMonth = n.getMonth();
	}

	function openDetail(b: B) {
		selected = b;
		dayListBookings = null;
		detailOpen = true;
	}

	function openDayList(bs: B[]) {
		selected = null;
		dayListBookings = bs;
		detailOpen = true;
	}

	$effect(() => {
		if (!detailOpen) {
			selected = null;
			dayListBookings = null;
		}
	});

	function timeShort(iso: string): string {
		return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Calendario — Admin</title>
</svelte:head>

<h1 class="mb-2 text-2xl font-semibold">Calendario prenotazioni</h1>
<p class="mb-6 text-sm text-muted-foreground">
	Scegli la macroarea, poi consulta il mese come in un calendario (solo prenotazioni confermate).
</p>

<div class="mb-6 max-w-md space-y-2">
	<Label for="ma">Macroarea</Label>
	<SearchableSelect
		id="ma"
		bind:value={macroAreaId}
		name="macroAreaId"
		items={macroItems}
		placeholder="Seleziona macroarea…"
		searchPlaceholder="Cerca macroarea…"
		commandLabel="Macroaree"
	/>
</div>

{#if !macroAreaId}
	<p class="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
		Seleziona una macroarea per visualizzare il calendario.
	</p>
{:else}
	<div
		class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm"
	>
		<div class="flex items-center gap-1">
			<Button variant="outline" size="icon-sm" type="button" onclick={prevMonth} aria-label="Mese precedente">
				<ChevronLeftIcon class="size-4" />
			</Button>
			<Button variant="outline" size="icon-sm" type="button" onclick={nextMonth} aria-label="Mese successivo">
				<ChevronRightIcon class="size-4" />
			</Button>
		</div>
		<h2 class="min-w-[10rem] text-center text-base font-semibold capitalize text-foreground">
			{monthTitle}
		</h2>
		<Button variant="secondary" size="sm" type="button" onclick={goToday}>Oggi</Button>
	</div>

	{#if loading}
		<p class="text-sm text-muted-foreground">Caricamento…</p>
	{/if}

	<div class="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
		<div class="grid min-w-[720px] grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
			{#each weekdayLabels as w}
				<div class="border-r border-border py-2 last:border-r-0">{w}</div>
			{/each}
		</div>
		<div class="grid min-w-[720px] grid-cols-7">
			{#each cells as { date, inMonth }, i (i)}
				{@const key = toIsoDate(date)}
				{@const dayBookings = byDay.get(key) ?? []}
				<div
					class="min-h-[6.5rem] border-b border-r border-border p-1 last:border-r-0 {inMonth
						? 'bg-card'
						: 'bg-muted/20 text-muted-foreground'}"
				>
					<div class="mb-1 flex justify-end">
						<span
							class="flex size-7 items-center justify-center rounded-full text-xs font-medium {inMonth
								? 'text-foreground'
								: 'text-muted-foreground'}"
						>
							{date.getDate()}
						</span>
					</div>
					<div class="flex flex-col gap-0.5">
						{#each dayBookings.slice(0, 3) as b (b.id)}
							<button
								type="button"
								class="truncate rounded-md border border-primary/20 bg-primary/10 px-1 py-0.5 text-left text-[0.65rem] leading-tight text-foreground transition hover:bg-primary/20"
								onclick={() => openDetail(b)}
							>
								<span class="font-medium text-primary">{timeShort(b.slotStart)}</span>
								<span class="block truncate text-muted-foreground">
									{b.firstName}
									{b.lastName}
								</span>
							</button>
						{/each}
						{#if dayBookings.length > 3}
							<button
								type="button"
								class="text-left text-[0.65rem] font-medium text-primary hover:underline"
								onclick={() => openDayList(dayBookings)}
							>
								+{dayBookings.length - 3} altre
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<Dialog.Root bind:open={detailOpen}>
	<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-md" showCloseButton={true}>
		{#if selected}
			<Dialog.Header>
				<Dialog.Title class="font-mono text-base">{selected.code}</Dialog.Title>
				<Dialog.Description>
					{new Date(selected.slotStart).toLocaleString('it-IT')} · {selected.visitTypeName}
				</Dialog.Description>
			</Dialog.Header>
			<dl class="grid gap-2 text-sm">
				<div>
					<dt class="text-muted-foreground">Paziente</dt>
					<dd class="font-medium">
						{selected.firstName}
						{selected.lastName}
					</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Codice fiscale</dt>
					<dd class="font-mono text-xs">{selected.fiscalCode}</dd>
				</div>
				<div>
					<dt class="text-muted-foreground">Telefono</dt>
					<dd>{selected.phone}</dd>
				</div>
				{#if selected.email}
					<div>
						<dt class="text-muted-foreground">Email</dt>
						<dd class="break-all">{selected.email}</dd>
					</div>
				{/if}
			</dl>
		{:else if dayListBookings}
			<Dialog.Header>
				<Dialog.Title>Prenotazioni del giorno</Dialog.Title>
				<Dialog.Description>Scegli una riga per i dettagli.</Dialog.Description>
			</Dialog.Header>
			<ul class="max-h-72 space-y-2 overflow-y-auto pe-1">
				{#each dayListBookings as b (b.id)}
					<li>
						<button
							type="button"
							class="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm transition hover:bg-muted/50"
							onclick={() => openDetail(b)}
						>
							<span class="font-medium text-primary">{timeShort(b.slotStart)}</span>
							<span class="block text-foreground">{b.firstName} {b.lastName}</span>
							<span class="text-xs text-muted-foreground">{b.visitTypeName}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Dialog.Content>
</Dialog.Root>
