<script lang="ts">
	import { onMount } from 'svelte';
	import { api, uploadReportFile } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import { SearchableSelect } from '$lib/components/ui/searchable-select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';
	import type { ReportAdminRow as R } from '$lib/api';

	type Macro = { id: number; name: string };
	type VisitType = {
		id: number;
		name: string;
		description: string | null;
		macroAreaId: number;
	};

	let rows = $state<R[]>([]);
	let macroAreas = $state<Macro[]>([]);
	let visitTypes = $state<VisitType[]>([]);
	let macroAreaId = $state('');
	let fiscalCode = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let visitTypeId = $state('');
	let examDate = $state('');
	let notes = $state('');
	let saving = $state(false);

	let notesOpen = $state(false);
	let notesRow = $state<R | null>(null);
	let editNotes = $state('');
	let savingNotes = $state(false);

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

	$effect(() => {
		const ok = visitTypesForMacro.some((vt) => String(vt.id) === visitTypeId);
		if (!ok) visitTypeId = '';
	});

	onMount(async () => {
		await refresh();
		try {
			const [macros, visits] = await Promise.all([
				api.admin.macroAreasList(),
				api.admin.visitTypesList()
			]);
			macroAreas = macros;
			visitTypes = visits;
			if (macros.length) {
				macroAreaId = String(macros[0]!.id);
				const firstVt = visits.find((v) => v.macroAreaId === macros[0]!.id);
				if (firstVt) visitTypeId = String(firstVt.id);
			}
		} catch (e) {
			toast.error('Errore caricamento macroaree / tipologie');
			console.error(e);
		}
		const t = new Date();
		examDate = t.toISOString().slice(0, 10);
	});

	async function refresh() {
		rows = await api.admin.reportsList();
	}

	async function createReport(e: Event) {
		e.preventDefault();
		const vt = Number(visitTypeId);
		if (!macroAreaId || !vt) {
			toast.error('Seleziona macroarea e tipologia esame');
			return;
		}
		saving = true;
		try {
			const r = await api.admin.reportCreate({
				fiscalCode,
				firstName,
				lastName,
				visitTypeId: vt,
				examDateIso: new Date(examDate).toISOString(),
				notes: notes || undefined
			});
			toast.success(`Referto creato: ${r.code}`);
			fiscalCode = '';
			firstName = '';
			lastName = '';
			notes = '';
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			saving = false;
		}
	}

	async function onFile(id: number, ev: Event) {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			await uploadReportFile(id, file);
			toast.success('File caricato');
			await refresh();
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : 'Upload fallito');
		}
		input.value = '';
	}

	function openNotes(r: R) {
		notesRow = r;
		editNotes = r.notes ?? '';
		notesOpen = true;
	}

	function closeNotes() {
		notesOpen = false;
		notesRow = null;
	}

	async function saveNotes(e: Event) {
		e.preventDefault();
		if (!notesRow) return;
		savingNotes = true;
		try {
			await api.admin.reportSetNotes({ id: notesRow.id, notes: editNotes.trim() || undefined });
			toast.success('Note aggiornate');
			closeNotes();
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			savingNotes = false;
		}
	}
</script>

<svelte:head>
	<title>Referti — Admin</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Referti</h1>

<form class="mb-8 space-y-3 rounded-lg border border-border p-4" onsubmit={createReport}>
	<p class="text-sm text-muted-foreground">Nuovo referto in stato “in attesa”; dopo il primo upload valido passa a “pronto”.</p>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="cf">Codice fiscale</Label>
			<Input id="cf" class="font-mono uppercase" maxlength={16} bind:value={fiscalCode} required />
		</div>
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
				class="w-full max-w-xs"
			/>
		</div>
		<div class="space-y-2">
			<Label for="vt">Tipologia (esame)</Label>
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
				class="w-full max-w-xs"
			/>
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
			<Label for="ed">Data esame</Label>
			<Input id="ed" type="date" bind:value={examDate} required />
		</div>
		<div class="space-y-2 sm:col-span-2">
			<Label for="no">Note</Label>
			<Textarea id="no" bind:value={notes} rows={2} />
		</div>
	</div>
	<Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Crea referto'}</Button>
</form>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Codice</TableHead>
				<TableHead>Paziente</TableHead>
				<TableHead>Esame</TableHead>
				<TableHead>Data</TableHead>
				<TableHead>Stato</TableHead>
				<TableHead>Note</TableHead>
				<TableHead>Allegato</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each rows as r}
				<TableRow>
					<TableCell class="font-mono text-xs">{r.code}</TableCell>
					<TableCell>
						{r.firstName}
						{r.lastName}
						<div class="text-xs text-muted-foreground font-mono">{r.fiscalCode}</div>
					</TableCell>
					<TableCell>{r.visitTypeName}</TableCell>
					<TableCell>{new Date(r.examDate).toLocaleDateString('it-IT')}</TableCell>
					<TableCell>
						<Badge variant={r.status === 'ready' ? 'default' : 'secondary'}>
							{r.status === 'ready' ? 'Pronto' : 'In attesa'}
						</Badge>
					</TableCell>
					<TableCell class="max-w-[10rem]">
						<p class="line-clamp-2 text-xs text-muted-foreground">{r.notes ?? '—'}</p>
						<Button
							size="sm"
							variant="link"
							class="h-auto px-0 text-xs"
							type="button"
							onclick={() => openNotes(r)}
						>
							Modifica note
						</Button>
					</TableCell>
					<TableCell>
						<Input
							type="file"
							accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
							class="max-w-[200px] cursor-pointer text-xs"
							onchange={(e) => onFile(r.id, e)}
						/>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>

<Dialog.Root bind:open={notesOpen}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={true}>
		<Dialog.Header>
			<Dialog.Title>Note referto {notesRow?.code}</Dialog.Title>
			<Dialog.Description>Testo visibile agli operatori e nel portale paziente.</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-3" onsubmit={saveNotes}>
			<Textarea bind:value={editNotes} rows={4} placeholder="Note cliniche o amministrative…" />
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={closeNotes}>Annulla</Button>
				<Button type="submit" disabled={savingNotes}>{savingNotes ? 'Salvataggio…' : 'Salva'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
