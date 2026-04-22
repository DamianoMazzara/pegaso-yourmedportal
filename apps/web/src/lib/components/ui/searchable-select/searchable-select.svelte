<script lang="ts">
	import { Command, Popover } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

	type Item = { value: string; label: string; keywords?: string[] };

	let {
		items = [] as Item[],
		value = $bindable(''),
		placeholder = 'Seleziona…',
		searchPlaceholder = 'Cerca…',
		emptyText = 'Nessun risultato',
		disabled = false,
		required = false,
		name,
		id,
		class: className,
		contentClass,
		commandLabel = 'Opzioni'
	}: {
		items?: Item[];
		value?: string;
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
		disabled?: boolean;
		required?: boolean;
		name?: string;
		id?: string;
		class?: string;
		contentClass?: string;
		commandLabel?: string;
	} = $props();

	let open = $state(false);
	let cmdKey = $state(0);

	const displayLabel = $derived(items.find((i) => i.value === value)?.label ?? '');
	const triggerDisabled = $derived(disabled || items.length === 0);

	function onOpenChange(v: boolean) {
		open = v;
		if (v) cmdKey += 1;
	}

	function selectItem(item: Item) {
		value = item.value;
		open = false;
	}
</script>

{#if name}
	<input type="hidden" {name} {value} {required} />
{/if}

<Popover.Root open={open} onOpenChange={onOpenChange}>
	<Popover.Trigger
		{id}
		type="button"
		role="combobox"
		aria-expanded={open}
		aria-haspopup="listbox"
		disabled={triggerDisabled}
		data-slot="searchable-select-trigger"
		class={cn(
			'border-input data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border bg-transparent px-2.5 text-sm shadow-xs transition-colors focus-visible:ring-3 aria-invalid:ring-3 h-8 flex w-full items-center justify-between gap-1.5 whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0',
			className
		)}
	>
		<span class="min-w-0 flex-1 truncate text-left" data-placeholder={displayLabel ? undefined : ''}>
			{displayLabel || placeholder}
		</span>
		<ChevronDownIcon class="text-muted-foreground size-4 shrink-0 opacity-50" />
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content
			data-slot="searchable-select-content"
			class={cn(
				'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-50 max-h-72 min-w-[var(--bits-popover-anchor-width)] origin-[var(--bits-popover-content-transform-origin)] overflow-hidden rounded-lg border border-border p-0 shadow-md outline-none',
				contentClass
			)}
			sideOffset={4}
			align="start"
			trapFocus={true}
		>
			{#key cmdKey}
				<Command.Root label={commandLabel} class="flex max-h-72 flex-col">
					<div class="border-b border-border px-2 py-1.5">
						<Command.Input
							placeholder={searchPlaceholder}
							class="placeholder:text-muted-foreground flex h-8 w-full rounded-md bg-transparent px-2 py-1 text-sm outline-none"
						/>
					</div>
					<Command.List class="max-h-[min(16rem,var(--bits-command-list-height))] overflow-y-auto overflow-x-hidden p-1">
						<Command.Viewport>
							<Command.Empty class="text-muted-foreground py-6 text-center text-sm">{emptyText}</Command.Empty>
							<Command.Group value="items">
								<Command.GroupItems>
									{#each items as item (item.value)}
										<Command.Item
											value={item.value}
											keywords={[item.label, ...(item.keywords ?? [])]}
											class="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
											onSelect={() => selectItem(item)}
										>
											{item.label}
										</Command.Item>
									{/each}
								</Command.GroupItems>
							</Command.Group>
						</Command.Viewport>
					</Command.List>
				</Command.Root>
			{/key}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
