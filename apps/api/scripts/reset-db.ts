import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { asc, eq, sql } from 'drizzle-orm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { db, pool } = await import('../src/db/index.js');
const {
	activityLogs,
	adminUsers,
	bookings,
	macroAreas,
	reports,
	visitTypes
} = await import('../src/db/schema.js');

async function dropAll() {
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
	for (const name of [
		'activity_logs',
		'report_attachments',
		'reports',
		'bookings',
		'visit_types',
		'macro_areas',
		'admin_users'
	]) {
		await db.execute(sql.raw(`DROP TABLE IF EXISTS \`${name}\``));
	}
	await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
}

/** drizzle-kit non espone `bin.cjs` in `package.exports`; risolviamo il file sul disco. */
function drizzleKitBin(startDir: string): string {
	let dir = startDir;
	for (let i = 0; i < 6; i++) {
		const pkgDir = join(dir, 'node_modules', 'drizzle-kit');
		const pkgJson = join(pkgDir, 'package.json');
		if (existsSync(pkgJson)) {
			const binEntry =
				(JSON.parse(readFileSync(pkgJson, 'utf8')) as { bin?: Record<string, string> }).bin?.[
					'drizzle-kit'
				] ?? 'bin.cjs';
			const binPath = join(pkgDir, binEntry);
			if (existsSync(binPath)) return binPath;
		}
		dir = dirname(dir);
	}
	throw new Error('drizzle-kit non trovato: eseguire npm install dalla root del workspace o in /app');
}

async function pushSchema() {
	const kitBin = drizzleKitBin(root);
	execSync(`node "${kitBin}" push --force`, {
		cwd: root,
		stdio: 'inherit',
		env: { ...process.env }
	});
}

const DEMO_PATIENTS = [
	{
		fiscalCode: 'RSSMRA80A01H501U',
		firstName: 'Mario',
		lastName: 'Rossi',
		age: 45,
		address: 'Via Roma 12, Palermo',
		phone: '+393331112233',
		email: 'mario.rossi@example.com'
	},
	{
		fiscalCode: 'BNCGNN85M01F205X',
		firstName: 'Giovanni',
		lastName: 'Bianchi',
		age: 40,
		address: 'Corso Italia 45, Milano',
		phone: '+393021234567',
		email: 'g.bianchi@example.com'
	},
	{
		fiscalCode: 'VRDNGL92H15E017Z',
		firstName: 'Angela',
		lastName: 'Verdi',
		age: 33,
		address: 'Via Dante 8, Torino',
		phone: '+393489990011',
		email: null as string | null
	},
	{
		fiscalCode: 'SPSLRN78C12F839A',
		firstName: 'Lorenzo',
		lastName: 'Esposito',
		age: 47,
		address: 'Piazza Garibaldi 3, Napoli',
		phone: '+393771112200',
		email: 'l.esposito@example.com'
	},
	{
		fiscalCode: 'MRORSS65D22H501B',
		firstName: 'Rosa',
		lastName: 'Amato',
		age: 60,
		address: 'Viale dei Mille 101, Genova',
		phone: '+393351234567',
		email: 'rosa.amato@example.com'
	},
	{
		fiscalCode: 'FRRMRA70A41H501U',
		firstName: 'Marco',
		lastName: 'Ferrari',
		age: 55,
		address: 'Via Mazzini 22, Bologna',
		phone: '+393298765432',
		email: null as string | null
	},
	{
		fiscalCode: 'GLLLCU88L02H501C',
		firstName: 'Lucia',
		lastName: 'Galli',
		age: 37,
		address: 'Lungarno 7, Firenze',
		phone: '+393661112233',
		email: 'lucia.galli@example.com'
	},
	{
		fiscalCode: 'RDILCU91M55Z404K',
		firstName: 'Luca',
		lastName: 'Rinaldi',
		age: 34,
		address: 'Via San Marco 19, Venezia',
		phone: '+393401234567',
		email: 'luca.r@example.com'
	},
	{
		fiscalCode: 'BNCNGL80T01F839O',
		firstName: 'Nicola',
		lastName: 'Bernardi',
		age: 45,
		address: 'Via Oberdan 4, Trieste',
		phone: '+393889990011',
		email: 'n.bernardi@example.com'
	},
	{
		fiscalCode: 'PRSGPP75E27H501Q',
		firstName: 'Giuseppe',
		lastName: 'Parisi',
		age: 50,
		address: 'Contrada Salice, Bari',
		phone: '+393221112200',
		email: null as string | null
	},
	{
		fiscalCode: 'CTOBTT82S12L219T',
		firstName: 'Roberta',
		lastName: 'Conti',
		age: 43,
		address: 'Via Nazionale 55, Catania',
		phone: '+393951234567',
		email: 'r.conti@example.com'
	},
	{
		fiscalCode: 'PLSVNT69A01H501W',
		firstName: 'Valentina',
		lastName: 'Pellegrini',
		age: 56,
		address: 'Via dei Colli 2, Perugia',
		phone: '+393751112233',
		email: 'v.pellegrini@example.com'
	},
	{
		fiscalCode: 'MRCGPP71B15H501A',
		firstName: 'Paolo',
		lastName: 'Marchetti',
		age: 54,
		address: 'Via Verdi 30, Parma',
		phone: '+393521998877',
		email: 'p.marchetti@example.com'
	},
	{
		fiscalCode: 'FRRNTN95C44F205B',
		firstName: 'Antonio',
		lastName: 'Ferretti',
		age: 30,
		address: 'Piazza Duomo 1, Modena',
		phone: '+393661554433',
		email: 'antonio.f@example.com'
	},
	{
		fiscalCode: 'SNTMRA88D12H501C',
		firstName: 'Maria',
		lastName: 'Santoro',
		age: 37,
		address: 'Via del Mare 88, Rimini',
		phone: '+393398877665',
		email: 'maria.santoro@example.com'
	}
] as const;

function slotAt(dayOffset: number, hour: number, minute: number): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + dayOffset);
	d.setHours(hour, minute, 0, 0);
	return d;
}

async function seed() {
	const passwordHash = bcrypt.hashSync('Admin123!', 10);
	await db.insert(adminUsers).values({
		email: 'admin@yourmedportal.test',
		name: 'Operatore Demo',
		passwordHash
	});
	const [admin] = await db
		.select({ id: adminUsers.id })
		.from(adminUsers)
		.where(eq(adminUsers.email, 'admin@yourmedportal.test'))
		.limit(1);

	const macroDefs = [
		{ name: 'Laboratorio analisi', slotDurationMinutes: 30, parallelSlots: 4 },
		{ name: 'Diagnostica per immagini', slotDurationMinutes: 60, parallelSlots: 2 },
		{ name: 'Cardiologia', slotDurationMinutes: 45, parallelSlots: 2 },
		{ name: 'Dermatologia', slotDurationMinutes: 20, parallelSlots: 3 },
		{ name: 'Medicina generale', slotDurationMinutes: 15, parallelSlots: 6 },
		{ name: 'Fisioterapia', slotDurationMinutes: 30, parallelSlots: 2 },
		{ name: 'Oculistica', slotDurationMinutes: 30, parallelSlots: 3 },
		{ name: 'Otorinolaringoiatria', slotDurationMinutes: 25, parallelSlots: 2 },
		{ name: 'Ginecologia', slotDurationMinutes: 30, parallelSlots: 2 },
		{ name: 'Ortopedia e traumatologia', slotDurationMinutes: 40, parallelSlots: 2 }
	];

	await db.insert(macroAreas).values([...macroDefs]);

	const macroRows = await db.select({ id: macroAreas.id, name: macroAreas.name }).from(macroAreas);
	const mid = (name: string) => macroRows.find((m) => m.name === name)!.id;

	const visitDefs: { name: string; description: string; macroName: string }[] = [
		{ name: 'Emocromo completo', description: 'Emocromo con formula', macroName: 'Laboratorio analisi' },
		{ name: 'Emoglobina glicata (HbA1c)', description: 'Controllo glicemia medio periodo', macroName: 'Laboratorio analisi' },
		{
			name: 'Profilo epatico',
			description: 'ALT, AST, bilirubina, GGT, fosfatasi alcalina',
			macroName: 'Laboratorio analisi'
		},
		{
			name: 'Profilo lipidico',
			description: 'Colesterolo totale, HDL, LDL, trigliceridi',
			macroName: 'Laboratorio analisi'
		},
		{ name: 'TSH e fT4', description: 'Funzione tiroidea', macroName: 'Laboratorio analisi' },
		{ name: 'Urinocultura', description: 'Urina con coltura batterica', macroName: 'Laboratorio analisi' },
		{ name: 'PSA totale e libero', description: 'Marcatori prostata (su indicazione)', macroName: 'Laboratorio analisi' },
		{ name: 'Vitamina D', description: 'Dosaggio 25-OH vitamina D', macroName: 'Laboratorio analisi' },
		{ name: 'Esame urine completo', description: 'Urinalisi con sedimenti', macroName: 'Laboratorio analisi' },
		{ name: 'Ecografia addome completo', description: 'Fegato, vie biliari, reni, vescica', macroName: 'Diagnostica per immagini' },
		{ name: 'Ecografia tiroide', description: 'Studio ecografico tiroide', macroName: 'Diagnostica per immagini' },
		{ name: 'Radiografia torace', description: 'RX standard', macroName: 'Diagnostica per immagini' },
		{ name: 'Mammografia bilaterale', description: 'Screening / diagnostica', macroName: 'Diagnostica per immagini' },
		{ name: 'RMN ginocchio', description: 'Risonanza magnetica articolazione', macroName: 'Diagnostica per immagini' },
		{ name: 'TC cranio senza mdc', description: 'Tomografia computerizzata', macroName: 'Diagnostica per immagini' },
		{ name: 'Ecografia mammaria', description: 'Complemento a mammografia', macroName: 'Diagnostica per immagini' },
		{ name: 'ECG a riposo', description: 'Elettrocardiogramma standard', macroName: 'Cardiologia' },
		{ name: 'Ecocardiogramma', description: 'Ecografia cardiaca', macroName: 'Cardiologia' },
		{ name: 'Holter pressorio 24h', description: 'Monitoraggio pressione arteriosa', macroName: 'Cardiologia' },
		{ name: 'Test da sforzo', description: 'Prova ergometrica (su idoneità)', macroName: 'Cardiologia' },
		{ name: 'Visita dermatologica', description: 'Prima visita o controllo', macroName: 'Dermatologia' },
		{ name: 'Mappatura nei', description: 'Dermatoscopia digitale', macroName: 'Dermatologia' },
		{ name: 'Crioterapia (singola lesione)', description: 'Piccolo intervento ambulatoriale', macroName: 'Dermatologia' },
		{ name: 'Visita medica generale', description: 'Visita di base', macroName: 'Medicina generale' },
		{ name: 'Certificazione idoneità sportiva', description: 'Non agonistica', macroName: 'Medicina generale' },
		{ name: 'Controllo cronico ipertensione', description: 'Follow-up PA', macroName: 'Medicina generale' },
		{ name: 'Valutazione fisioterapica', description: 'Primo accesso', macroName: 'Fisioterapia' },
		{ name: 'Seduta fisioterapica', description: 'Trattamento singola seduta', macroName: 'Fisioterapia' },
		{ name: 'Riabilitazione posturale', description: 'Percorso dedicato', macroName: 'Fisioterapia' },
		{ name: 'Visita oculistica completa', description: 'Con tonometria e fundus', macroName: 'Oculistica' },
		{ name: 'Campo visivo computerizzato', description: 'Perimetria', macroName: 'Oculistica' },
		{ name: 'Visita ORL', description: 'Esame orecchie, naso, gola', macroName: 'Otorinolaringoiatria' },
		{ name: 'Audiometria', description: 'Test dell’udito', macroName: 'Otorinolaringoiatria' },
		{ name: 'Visita ginecologica', description: 'Controllo annuale', macroName: 'Ginecologia' },
		{ name: 'Ecografia transvaginale', description: 'Studio ecografico pelvi', macroName: 'Ginecologia' },
		{ name: 'Visita ortopedica', description: 'Prima visita', macroName: 'Ortopedia e traumatologia' },
		{ name: 'Infiltrazione articolare', description: 'Su prescrizione', macroName: 'Ortopedia e traumatologia' }
	];

	await db.insert(visitTypes).values(
		visitDefs.map((v) => ({
			name: v.name,
			description: v.description,
			macroAreaId: mid(v.macroName)
		}))
	);

	const vtRows = await db.select({ id: visitTypes.id }).from(visitTypes).orderBy(asc(visitTypes.id));
	const vtIds = vtRows.map((r) => r.id);

	const bookingSlots: { day: number; h: number; m: number; cancelled: boolean }[] = [
		{ day: -85, h: 9, m: 0, cancelled: false },
		{ day: -82, h: 10, m: 30, cancelled: true },
		{ day: -78, h: 8, m: 0, cancelled: false },
		{ day: -75, h: 11, m: 0, cancelled: false },
		{ day: -72, h: 14, m: 30, cancelled: false },
		{ day: -70, h: 9, m: 30, cancelled: true },
		{ day: -68, h: 16, m: 0, cancelled: false },
		{ day: -65, h: 10, m: 0, cancelled: false },
		{ day: -62, h: 15, m: 0, cancelled: false },
		{ day: -60, h: 8, m: 30, cancelled: false },
		{ day: -58, h: 11, m: 30, cancelled: true },
		{ day: -55, h: 9, m: 0, cancelled: false },
		{ day: -52, h: 12, m: 0, cancelled: false },
		{ day: -50, h: 14, m: 0, cancelled: false },
		{ day: -48, h: 10, m: 30, cancelled: false },
		{ day: -45, h: 17, m: 0, cancelled: true },
		{ day: -42, h: 9, m: 30, cancelled: false },
		{ day: -40, h: 11, m: 0, cancelled: false },
		{ day: -38, h: 8, m: 0, cancelled: false },
		{ day: -35, h: 13, m: 30, cancelled: false },
		{ day: -32, h: 10, m: 0, cancelled: false },
		{ day: -30, h: 15, m: 30, cancelled: false },
		{ day: -28, h: 9, m: 0, cancelled: true },
		{ day: -25, h: 12, m: 30, cancelled: false },
		{ day: -22, h: 16, m: 30, cancelled: false },
		{ day: -20, h: 8, m: 30, cancelled: false },
		{ day: -18, h: 11, m: 0, cancelled: false },
		{ day: -15, h: 14, m: 0, cancelled: false },
		{ day: -12, h: 10, m: 30, cancelled: false },
		{ day: -10, h: 9, m: 0, cancelled: true },
		{ day: -8, h: 13, m: 0, cancelled: false },
		{ day: -6, h: 15, m: 0, cancelled: false },
		{ day: -5, h: 11, m: 30, cancelled: false },
		{ day: -4, h: 8, m: 0, cancelled: false },
		{ day: -3, h: 10, m: 0, cancelled: false },
		{ day: -2, h: 14, m: 30, cancelled: false },
		{ day: -1, h: 9, m: 30, cancelled: false },
		{ day: 0, h: 10, m: 0, cancelled: false },
		{ day: 0, h: 11, m: 30, cancelled: false },
		{ day: 0, h: 15, m: 0, cancelled: false },
		{ day: 0, h: 16, m: 30, cancelled: true },
		{ day: 1, h: 8, m: 30, cancelled: false },
		{ day: 1, h: 9, m: 30, cancelled: false },
		{ day: 1, h: 11, m: 0, cancelled: false },
		{ day: 1, h: 14, m: 0, cancelled: false },
		{ day: 2, h: 10, m: 0, cancelled: false },
		{ day: 2, h: 12, m: 0, cancelled: false },
		{ day: 2, h: 15, m: 30, cancelled: false },
		{ day: 3, h: 9, m: 0, cancelled: false },
		{ day: 3, h: 13, m: 0, cancelled: true },
		{ day: 4, h: 8, m: 0, cancelled: false },
		{ day: 4, h: 11, m: 30, cancelled: false },
		{ day: 5, h: 10, m: 30, cancelled: false },
		{ day: 6, h: 9, m: 30, cancelled: false },
		{ day: 7, h: 14, m: 0, cancelled: false },
		{ day: 8, h: 16, m: 0, cancelled: false },
		{ day: 10, h: 8, m: 30, cancelled: false },
		{ day: 12, h: 11, m: 0, cancelled: false },
		{ day: 14, h: 10, m: 0, cancelled: false },
		{ day: 16, h: 15, m: 30, cancelled: false },
		{ day: 18, h: 9, m: 0, cancelled: false },
		{ day: 21, h: 12, m: 30, cancelled: false }
	];

	const bookingRows = bookingSlots.map((s, i) => {
		const p = DEMO_PATIENTS[i % DEMO_PATIENTS.length]!;
		return {
			code: `PN-M${String(i + 1).padStart(4, '0')}`,
			fiscalCode: p.fiscalCode,
			firstName: p.firstName,
			lastName: p.lastName,
			age: p.age,
			address: p.address,
			phone: p.phone,
			email: p.email ?? undefined,
			visitTypeId: vtIds[i % vtIds.length]!,
			slotStart: slotAt(s.day, s.h, s.m),
			status: (s.cancelled ? 'cancelled' : 'confirmed') as 'cancelled' | 'confirmed'
		};
	});

	await db.insert(bookings).values(bookingRows);

	const reportSpecs: { day: number; pending: boolean; note?: string }[] = [
		{ day: -175, pending: true, note: 'In attesa allegato PDF firmato' },
		{ day: -168, pending: false },
		{ day: -160, pending: false },
		{ day: -155, pending: true, note: 'Paziente ha caricato file errato — da ricaricare' },
		{ day: -150, pending: false },
		{ day: -142, pending: false },
		{ day: -135, pending: true },
		{ day: -128, pending: false },
		{ day: -120, pending: false },
		{ day: -115, pending: false },
		{ day: -108, pending: true, note: 'Esame strumentale — referto in redazione' },
		{ day: -102, pending: false },
		{ day: -95, pending: false },
		{ day: -88, pending: false },
		{ day: -82, pending: true },
		{ day: -78, pending: false },
		{ day: -72, pending: false },
		{ day: -68, pending: false },
		{ day: -62, pending: false },
		{ day: -58, pending: true },
		{ day: -52, pending: false },
		{ day: -48, pending: false },
		{ day: -44, pending: false },
		{ day: -38, pending: false },
		{ day: -35, pending: true, note: 'Seconda opinione richiesta' },
		{ day: -30, pending: false },
		{ day: -26, pending: false },
		{ day: -22, pending: false },
		{ day: -18, pending: false },
		{ day: -14, pending: true },
		{ day: -10, pending: false },
		{ day: -7, pending: false },
		{ day: -5, pending: false },
		{ day: -3, pending: false },
		{ day: -1, pending: true, note: 'Referto demo in attesa (PN correlata)' },
		{ day: 0, pending: false, note: 'Referto completato oggi (test download)' }
	];

	const reportRows = reportSpecs.map((r, i) => {
		const p = DEMO_PATIENTS[(i + 3) % DEMO_PATIENTS.length]!;
		const exam = new Date();
		exam.setHours(12, 0, 0, 0);
		exam.setDate(exam.getDate() + r.day);
		return {
			code: `RF-M${String(i + 1).padStart(4, '0')}`,
			fiscalCode: p.fiscalCode,
			firstName: p.firstName,
			lastName: p.lastName,
			visitTypeId: vtIds[(i * 2) % vtIds.length]!,
			examDate: exam,
			notes: r.note ?? (r.pending ? 'In elaborazione' : null),
			status: (r.pending ? 'pending' : 'ready') as 'pending' | 'ready'
		};
	});

	await db.insert(reports).values(reportRows);

	const logTimes = [-20, -18, -14, -10, -7, -5, -3, -2, -1, 0].map((d) => {
		const t = new Date();
		t.setDate(t.getDate() + d);
		t.setHours(9 + (Math.abs(d) % 5), (Math.abs(d) * 7) % 60, 0, 0);
		return t;
	});

	await db.insert(activityLogs).values([
		{
			adminUserId: admin!.id,
			action: 'seed',
			entityType: 'system',
			entityId: 'reset-db',
			details: {
				message: 'Database popolato con dataset esteso (macroaree, tipologie, prenotazioni, referti)'
			},
			createdAt: logTimes[0]!
		},
		...logTimes.slice(1).map((createdAt, i) => ({
			adminUserId: admin!.id,
			action: ['macro_area.create', 'visit_type.create', 'booking.create', 'report.create', 'admin.login'][i % 5]!,
			entityType: ['macro_area', 'visit_type', 'booking', 'report', 'admin_user'][i % 5]!,
			entityId: String((i % 40) + 1),
			details: { source: 'seed', index: i },
			createdAt
		}))
	]);

	console.log('Seed completato.');
	console.log('Admin: admin@yourmedportal.test / Admin123!');
	console.log(
		`Dataset: ${macroDefs.length} macroaree, ${visitDefs.length} tipologie, ${bookingRows.length} prenotazioni, ${reportRows.length} referti (+ log attività).`
	);
	console.log(`Pazienti demo (CF): ${DEMO_PATIENTS.map((p) => p.fiscalCode).slice(0, 3).join(', ')}…`);
}

async function main() {
	console.log('Reset database...');
	await dropAll();
	console.log('Push schema (drizzle-kit)...');
	await pushSchema();
	console.log('Inserimento dati di esempio...');
	await seed();
	await pool.end();
}

main().catch(async (e) => {
	console.error(e);
	await pool.end();
	process.exit(1);
});
