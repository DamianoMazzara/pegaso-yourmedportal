<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';

	type Row = {
		id: number;
		name: string;
		slotDurationMinutes: number;
		parallelSlots: number;
	};

	let rows = $state<Row[]>([]);
	let name = $state('');
	let slotDurationMinutes = $state(30);
	let parallelSlots = $state(1);
	let saving = $state(false);

	let editOpen = $state(false);
	let editing = $state<Row | null>(null);
	let editName = $state('');
	let editSlot = $state(30);
	let editParallel = $state(1);
	let savingEdit = $state(false);

	onMount(async () => {
		await refresh();
	});

	async function refresh() {
		rows = await api.admin.macroAreasList();
	}

	function openEdit(r: Row) {
		editing = r;
		editName = r.name;
		editSlot = r.slotDurationMinutes;
		editParallel = r.parallelSlots;
		editOpen = true;
	}

	function closeEdit() {
		editOpen = false;
		editing = null;
	}

	async function saveEdit(e: Event) {
		e.preventDefault();
		if (!editing) return;
		savingEdit = true;
		try {
			await api.admin.macroAreaUpdate({
				id: editing.id,
				name: editName.trim(),
				slotDurationMinutes: Number(editSlot),
				parallelSlots: Number(editParallel)
			});
			toast.success('Macroarea aggiornata');
			closeEdit();
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			savingEdit = false;
		}
	}

	async function add(e: Event) {
		e.preventDefault();
		saving = true;
		try {
			await api.admin.macroAreaCreate({
				name,
				slotDurationMinutes: Number(slotDurationMinutes),
				parallelSlots: Number(parallelSlots)
			});
			toast.success('Macroarea creata');
			name = '';
			slotDurationMinutes = 30;
			parallelSlots = 1;
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			saving = false;
		}
	}

	async function remove(id: number) {
		if (!confirm('Eliminare questa macroarea?')) return;
		try {
			await api.admin.macroAreaDelete({ id });
			toast.success('Eliminata');
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		}
	}
</script>

<svelte:head>
	<title>Macroaree — Admin</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Macroaree</h1>

<form class="mb-8 flex max-w-xl flex-col gap-3 rounded-lg border border-border p-4" onsubmit={add}>
	<p class="text-sm text-muted-foreground">Durata slot e postazioni parallele (es. più cabine laboratorio).</p>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2 sm:col-span-2">
			<Label for="n">Nome</Label>
			<Input id="n" bind:value={name} required />
		</div>
		<div class="space-y-2">
			<Label for="d">Durata slot (min)</Label>
			<Input id="d" type="number" min="5" max="240" bind:value={slotDurationMinutes} required />
		</div>
		<div class="space-y-2">
			<Label for="p">Slot paralleli</Label>
			<Input id="p" type="number" min="1" max="50" bind:value={parallelSlots} required />
		</div>
	</div>
	<Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi'}</Button>
</form>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Nome</TableHead>
				<TableHead>Min/slot</TableHead>
				<TableHead>Paralleli</TableHead>
				<TableHead class="min-w-[11rem]"></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each rows as r}
				<TableRow>
					<TableCell class="font-medium">{r.name}</TableCell>
					<TableCell>{r.slotDurationMinutes}</TableCell>
					<TableCell>{r.parallelSlots}</TableCell>
					<TableCell class="flex flex-wrap gap-2">
						<Button size="sm" variant="secondary" type="button" onclick={() => openEdit(r)}>
							Modifica
						</Button>
						<Button size="sm" variant="destructive" type="button" onclick={() => remove(r.id)}>
							Elimina
						</Button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>

<Dialog.Root bind:open={editOpen} onOpenChange={(o) => !o && closeEdit()}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={true}>
		<Dialog.Header>
			<Dialog.Title>Modifica macroarea</Dialog.Title>
			<Dialog.Description>Aggiorna nome, durata slot e postazioni parallele.</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-3" onsubmit={saveEdit}>
			<div class="space-y-2">
				<Label for="en">Nome</Label>
				<Input id="en" bind:value={editName} required />
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="space-y-2">
					<Label for="es">Durata slot (min)</Label>
					<Input id="es" type="number" min="5" max="240" bind:value={editSlot} required />
				</div>
				<div class="space-y-2">
					<Label for="ep">Slot paralleli</Label>
					<Input id="ep" type="number" min="1" max="50" bind:value={editParallel} required />
				</div>
			</div>
			<Dialog.Footer class="gap-2 sm:justify-end">
				<Button type="button" variant="outline" onclick={closeEdit}>Annulla</Button>
				<Button type="submit" disabled={savingEdit}>{savingEdit ? 'Salvataggio…' : 'Salva'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
