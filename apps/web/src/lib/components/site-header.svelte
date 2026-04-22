<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/prenota', label: 'Prenota' },
		{ href: '/annulla', label: 'Annulla prenotazione' },
		{ href: '/referti', label: 'Referti' },
		{ href: '/admin', label: 'Area operatori' }
	];
</script>

{#if !page.url.pathname.startsWith('/admin')}
	<header class="border-b border-border bg-card/80 backdrop-blur-sm">
		<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
			<a
				href="/"
				class="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground"
			>
				<img src="/logo.png" alt="" width="36" height="36" class="size-9 shrink-0 object-contain" />
				<span>YourMedPortal</span>
			</a>
			<nav class="flex flex-wrap items-center gap-1">
				{#each links as l}
					<Button variant={page.url.pathname === l.href ? 'secondary' : 'ghost'} size="sm" href={l.href}>
						{l.label}
					</Button>
				{/each}
			</nav>
		</div>
	</header>
{/if}
