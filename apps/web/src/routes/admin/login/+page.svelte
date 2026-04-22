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
	import { api, setAdminToken } from '$lib/api';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let email = $state('admin@yourmedportal.test');
	let password = $state('');
	let loading = $state(false);

	async function submit(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			const r = await api.admin.login({ email, password });
			setAdminToken(r.token);
			toast.success('Accesso effettuato');
			await goto('/admin');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Credenziali non valide';
			toast.error(msg);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login operatori — YourMedPortal</title>
</svelte:head>

<Card>
	<CardHeader>
		<CardTitle>Area operatori</CardTitle>
		<CardDescription>Accedi con le credenziali di laboratorio.</CardDescription>
	</CardHeader>
	<CardContent>
		<form class="space-y-4" onsubmit={submit}>
			<div class="space-y-2">
				<Label for="em">Email</Label>
				<Input id="em" type="email" autocomplete="username" bind:value={email} required />
			</div>
			<div class="space-y-2">
				<Label for="pw">Password</Label>
				<Input id="pw" type="password" autocomplete="current-password" bind:value={password} required />
			</div>
			<Button type="submit" class="w-full" disabled={loading}>{loading ? 'Accesso…' : 'Entra'}</Button>
		</form>
	</CardContent>
</Card>
