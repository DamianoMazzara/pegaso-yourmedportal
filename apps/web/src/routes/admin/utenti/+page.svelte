<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type AdminUserRow } from '$lib/api';
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
	import { toast } from 'svelte-sonner';

	let rows = $state<AdminUserRow[]>([]);
	let email = $state('');
	let name = $state('');
	let password = $state('');
	let saving = $state(false);

	onMount(async () => {
		await refresh();
	});

	async function refresh() {
		rows = await api.admin.adminUsersList();
	}

	async function add(e: Event) {
		e.preventDefault();
		saving = true;
		try {
			await api.admin.adminUserCreate({ email, name, password });
			toast.success('Utente creato');
			email = '';
			name = '';
			password = '';
			await refresh();
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Errore');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Utenti admin — Admin</title>
</svelte:head>

<h1 class="mb-6 text-2xl font-semibold">Utenti amministrativi</h1>

<form class="mb-8 flex max-w-xl flex-col gap-3 rounded-lg border border-border p-4" onsubmit={add}>
	<div class="space-y-2">
		<Label for="em">Email</Label>
		<Input id="em" type="email" bind:value={email} required autocomplete="off" />
	</div>
	<div class="space-y-2">
		<Label for="nm">Nome</Label>
		<Input id="nm" bind:value={name} required />
	</div>
	<div class="space-y-2">
		<Label for="pw">Password (min 8 caratteri)</Label>
		<Input id="pw" type="password" bind:value={password} required minlength={8} autocomplete="new-password" />
	</div>
	<Button type="submit" disabled={saving}>{saving ? 'Creazione…' : 'Aggiungi operatore'}</Button>
</form>

<div class="overflow-x-auto rounded-lg border border-border">
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Nome</TableHead>
				<TableHead>Email</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each rows as u}
				<TableRow>
					<TableCell class="font-medium">{u.name}</TableCell>
					<TableCell>{u.email}</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
