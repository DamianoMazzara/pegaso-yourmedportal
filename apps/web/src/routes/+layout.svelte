<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { ModeWatcher } from 'mode-watcher';
	import Toaster from '$lib/components/ui/sonner/sonner.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';

	let { children } = $props();

	const mainClass = $derived(
		page.url.pathname.startsWith('/admin') && page.url.pathname !== '/admin/login'
			? 'mx-auto w-full max-w-7xl flex-1 px-4 py-8'
			: 'mx-auto w-full max-w-5xl flex-1 px-4 py-8'
	);
</script>

<svelte:head>
	<title>YourMedPortal</title>
	<link rel="icon" href="/logo.png" type="image/png" />
	<link rel="apple-touch-icon" href="/logo.png" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
		rel="stylesheet"
	/>
	<style>
		html {
			font-family: 'DM Sans', system-ui, sans-serif;
		}
	</style>
</svelte:head>

<ModeWatcher />
<Toaster />
<div class="flex min-h-screen flex-col">
	<SiteHeader />
	<main class={mainClass}>
		{@render children()}
	</main>
	<footer class="border-t border-border py-6 text-center text-sm text-muted-foreground">
		YourMedPortal — portale demo laboratorio analisi (progetto didattico)
	</footer>
</div>
