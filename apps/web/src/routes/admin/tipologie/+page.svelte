<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { toast } from 'svelte-sonner';

	type VT = {
		id: number;
		name: string;
		description: string | null;
		macroAreaId: number;
		macroAreaName: string;
	};

	let visitTypes = $state<VT[]>([]);
	let macroAreas = $state<{ id: number; name: string }[]>([]);
	let name = $state('');
	let description = $state('');
	let macroAreaId = $state('');
	let saving = $state(false);

	let editOpen = $state(false);
	let editing = $state<VT | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let editMacroId = $state('');
	let savingEdit = $state(false);

	onMount(async () => {
		await refresh();
	});

	async function refresh() {
		visitTypes = await api.admin.visitTypesList();
		macroAreas = await api.admin.macroAreasList();
		if (macroAreas.length && !macroAreaId) macroAreaId = String(macroAreas[0].id);
	}

	function openEdit(v: VT) {
		editing = v;
		editName = v.name;
		editDescription = v.description ?? '';
		editMacroId = String(v.macroAreaId);
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
			await api.admin.visitTypeUpdate({
				id: editing.id,
				name: editName.trim(),
				description: editDescription.trim() || undefined,
				macroAreaId: Number(editMacroId)
			});
			toast.success('Tipologia aggiornata');
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
			await api.admin.visitTypeCreate({
				name,
				description: description || undefined,
				macroAreaId: Number(macroAreaId)
			});
			toast.success('Tipologia creata');
			name = '';
			description = '';
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			saving = false;
		}
	}

	async function remove(id: number) {
		if (!confirm('Eliminare questa tipologia?')) return;
		try {
			await api.admin.visitTypeDelete({ id });
			toast.success('Eliminata');
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		}
	}
</script>

<svelte:head>
	<title>Tipologie visita — Admin</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Tipologie di visita</h1>

<form class="mb-8 space-y-3 rounded-lg border border-border p-4" onsubmit={add}>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-2">
			<Label for="n">Nome</Label>
			<Input id="n" bind:value={name} required />
		</div>
		<div class="space-y-2">
			<Label for="m">Macroarea</Label>
			<Select
				type="single"
				bind:value={macroAreaId}
				name="macroAreaId"
				required
				disabled={macroAreas.length === 0}
				items={macroAreas.map((m) => ({ value: String(m.id), label: m.name }))}
			>
				<SelectTrigger id="m" class="w-full max-w-xs">
					<span data-slot="select-value" class="truncate">
						{macroAreas.find((m) => String(m.id) === macroAreaId)?.name ?? 'Macroarea…'}
					</span>
				</SelectTrigger>
				<SelectContent>
					{#each macroAreas as m}
						<SelectItem value={String(m.id)} label={m.name}>{m.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
		<div class="space-y-2 sm:col-span-2">
			<Label for="d">Descrizione</Label>
			<Textarea id="d" bind:value={description} rows={2} />
		</div>
	</div>
	<Button type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi tipologia'}</Button>
</form>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Nome</TableHead>
				<TableHead>Macroarea</TableHead>
				<TableHead class="min-w-[11rem]"></TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each visitTypes as v}
				<TableRow>
					<TableCell class="font-medium">{v.name}</TableCell>
					<TableCell>{v.macroAreaName}</TableCell>
					<TableCell class="flex flex-wrap gap-2">
						<Button size="sm" variant="secondary" type="button" onclick={() => openEdit(v)}>
							Modifica
						</Button>
						<Button size="sm" variant="destructive" type="button" onclick={() => remove(v.id)}>
							Elimina
						</Button>
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content class="sm:max-w-md" showCloseButton={true}>
		<Dialog.Header>
			<Dialog.Title>Modifica tipologia</Dialog.Title>
			<Dialog.Description>Aggiorna nome, descrizione e macroarea.</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-3" onsubmit={saveEdit}>
			<div class="space-y-2">
				<Label for="en">Nome</Label>
				<Input id="en" bind:value={editName} required />
			</div>
			<div class="space-y-2">
				<Label for="emac">Macroarea</Label>
				<Select
					type="single"
					bind:value={editMacroId}
					required
					disabled={macroAreas.length === 0}
					items={macroAreas.map((m) => ({ value: String(m.id), label: m.name }))}
				>
					<SelectTrigger id="emac" class="w-full max-w-xs">
						<span data-slot="select-value" class="truncate">
							{macroAreas.find((m) => String(m.id) === editMacroId)?.name ?? 'Macroarea…'}
						</span>
					</SelectTrigger>
					<SelectContent>
						{#each macroAreas as m}
							<SelectItem value={String(m.id)} label={m.name}>{m.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
			<div class="space-y-2">
				<Label for="edesc">Descrizione</Label>
				<Textarea id="edesc" bind:value={editDescription} rows={2} />
			</div>
			<Dialog.Footer class="gap-2 sm:justify-end">
				<Button type="button" variant="outline" onclick={closeEdit}>Annulla</Button>
				<Button type="submit" disabled={savingEdit}>{savingEdit ? 'Salvataggio…' : 'Salva'}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
