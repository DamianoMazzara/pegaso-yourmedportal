<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
</script>

<svelte:head>
	<title>YourMedPortal — Home</title>
</svelte:head>

<div class="space-y-8">
	<section class="space-y-3">
		<h1 class="text-3xl font-semibold tracking-tight text-foreground">Benvenuto in YourMedPortal</h1>
		<p class="max-w-2xl text-muted-foreground">
			Prenota una prestazione senza registrarti (ti servirà il codice fiscale), gestisci la prenotazione con il
			codice univoco <span class="font-mono text-foreground">PN-*****</span>, oppure consulta i referti con codice
			fiscale e codice referto <span class="font-mono text-foreground">RF-*****</span>.
		</p>
	</section>

	<div class="grid gap-4 sm:grid-cols-2">
		<Card>
			<CardHeader>
				<CardTitle>Pazienti</CardTitle>
				<CardDescription>Prenotazione e referti senza account</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-2">
				<Button href="/prenota">Nuova prenotazione</Button>
				<Button href="/annulla" variant="outline">Annulla prenotazione</Button>
				<Button href="/referti" variant="secondary">Consulta referto</Button>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Orari del laboratorio</CardTitle>
				<CardDescription>Fasce orarie usate dal calendario delle prenotazioni</CardDescription>
			</CardHeader>
			<CardContent>
				<ul class="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
					<li>Mattina 09:00 – 14:00</li>
					<li>Pausa 14:00 – 16:00</li>
					<li>Pomeriggio 16:00 – 19:00</li>
				</ul>
			</CardContent>
		</Card>
	</div>

	<section class="space-y-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
		<p class="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground">
			<strong class="font-medium">Nota.</strong>
			Questo sito è realizzato
			<em>a scopo accademico e dimostrativo</em>
			e
			<strong>non</strong>
			è il sito ufficiale né rappresenta le aziende citate sotto. I riferimenti societari e autorizzativi sono riportati solo come
			esempio di contenuto; eventuali partite IVA, codici fiscali o codici censuali sono indicati come
			<span class="font-mono">0000</span>
			per non esporre dati reali.
		</p>
		<div class="space-y-4 text-muted-foreground">
			<div>
				<p class="font-medium text-foreground">ma.fi.r. s.r.l.</p>
				<p class="mt-1 leading-relaxed">
					Autorizzazione Sanitaria A.S.P. 6 PA n°1505 del 06-08-2012 — Accreditamento D.D.G. n°2701 del 30-11-2007 — Codice
					Struttura 466400
				</p>
				<p class="mt-2 text-xs">P.IVA 0000 · Codice fiscale 0000 · Codice censuario / SDI 0000</p>
			</div>
			<div>
				<p class="font-medium text-foreground">Pa.ma.fi.r. Analisi Cliniche s.r.l.</p>
				<p class="mt-1 leading-relaxed">
					Autorizzazione Sanitaria A.S.P. 6 PA n°1715 del 27-09-2022 — Accreditamento D.A. del 10-01-2013 — Codice Struttura
					462200
				</p>
				<p class="mt-2 text-xs">P.IVA 0000 · Codice fiscale 0000 · Codice censuario / SDI 0000</p>
			</div>
		</div>
	</section>
</div>
