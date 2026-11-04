-- Story: "Llegada a la ciudad".
-- Llegas de provincia con una maleta y nada más. Doña Lupe te da chamba en su
-- taquería, el Profe te enseña la ciudad, El Chino te presenta al barrio... hasta
-- que Los Tlacuaches empiezan a cobrar "piso". Tú decides: el camino honrado
-- (con la SSC) o el chueco (con El Chino). Ambos terminan frente a El Patrón.
--
-- Tipos de paso:
--   Talk   { Npc, Lines }                          habla con un personaje
--   Choice { Npc, Lines, Options = {{Text, Path}} } decide el camino
--   GoTo   { Pos, Radius, Label, Vehicle? }        llega a un lugar (Vehicle = manejando)
--   Route  { Points = {{Pos, Label}}, Radius }     varios lugares en orden
--   Job    { Job, Label }                          ten cierto trabajo
--   Defeat { Group, Label }                        vence a los enemigos del grupo
-- Path = "Honrado" / "Chueco": el paso solo cuenta en ese camino.

local Story = {}

local V = Vector3.new

-- Personajes ---------------------------------------------------------------
Story.Npcs = {
	Lupe = { Name = "Doña Lupe", Pos = V(-90, 0, 152), Face = V(-60, 0, 152), Skin = Color3.fromRGB(170, 120, 85), Shirt = Color3.fromRGB(200, 40, 70), Pants = Color3.fromRGB(40, 40, 60) },
	Profe = { Name = "El Profe", Pos = V(-56, 0, -46), Face = V(-56, 0, 0), Skin = Color3.fromRGB(150, 105, 75), Shirt = Color3.fromRGB(120, 100, 70), Pants = Color3.fromRGB(70, 60, 50) },
	Chino = { Name = "El Chino", Pos = V(16, 0, 822), Face = V(0, 0, 800), Skin = Color3.fromRGB(190, 145, 105), Shirt = Color3.fromRGB(30, 30, 35), Pants = Color3.fromRGB(40, 70, 120) },
	Ramirez = { Name = "Comandante Ramírez", Pos = V(395, 0, 145), Face = V(395, 0, 200), Skin = Color3.fromRGB(160, 115, 80), Shirt = Color3.fromRGB(20, 40, 110), Pants = Color3.fromRGB(20, 25, 40) },
	Tuerto = { Name = "El Tuerto", Pos = V(445, 0, 548), Face = V(445, 0, 520), Skin = Color3.fromRGB(140, 100, 70), Shirt = Color3.fromRGB(100, 30, 30), Pants = Color3.fromRGB(30, 30, 30) },
}

-- Lugares clave ---------------------------------------------------------------
Story.Places = {
	Bodega = V(520, 0, 470),
	Mansion = V(-960, 0, -440),
}

-- Enemigos por grupo. Health por defecto 100.
Story.Groups = {
	Bodega = {
		{ Pos = V(505, 0, 455), Weapon = "Pistola" },
		{ Pos = V(535, 0, 458), Weapon = "Pistola" },
		{ Pos = V(512, 0, 485), Weapon = "Escopeta" },
		{ Pos = V(530, 0, 490), Weapon = "Pistola" },
	},
	Mansion = {
		{ Pos = V(-985, 0, -425), Weapon = "Subfusil" },
		{ Pos = V(-935, 0, -425), Weapon = "Subfusil" },
		{ Pos = V(-990, 0, -455), Weapon = "Pistola" },
		{ Pos = V(-930, 0, -455), Weapon = "Pistola" },
		{ Pos = V(-960, 0, -470), Weapon = "Escopeta" },
		{ Pos = V(-960, 0, -455), Weapon = "Rifle", Boss = true, Name = "El Patrón", Health = 450 },
	},
}

Story.Chapters = {
	-- 1 ---------------------------------------------------------------------
	{
		Title = "Recién llegado",
		Reward = 200,
		Steps = {
			{ Type = "Talk", Npc = "Lupe", Lines = {
				"¡Ándale, mijo! ¿Recién bajadito del camión? Se te ve en la cara.",
				"Aquí en la CDMX nadie regala nada, pero yo te echo la mano.",
				"Mis repartidores no llegaron. Llévame estas tres órdenes de pastor, ¡y que no se enfríen!",
			} },
			{ Type = "Route", Radius = 14, Points = {
				{ Pos = V(0, 0, -92), Label = "Entrega la orden en la Catedral (1/3)" },
				{ Pos = V(-180, 0, -100), Label = "Entrega la orden en la Torre Latino (2/3)" },
				{ Pos = V(-330, 0, -88), Label = "Entrega la orden en Bellas Artes (3/3)" },
			} },
			{ Type = "Talk", Npc = "Lupe", Lines = {
				"¡Eres rapidísimo! Toma, tu primera lana honrada.",
				"Oye, para moverte vas a necesitar conocer la ciudad. Búscate al Profe en el Metro Zócalo.",
			} },
		},
	},
	-- 2 ---------------------------------------------------------------------
	{
		Title = "Conociendo la ciudad",
		Reward = 250,
		Steps = {
			{ Type = "Talk", Npc = "Profe", Lines = {
				"Buenas, joven. Treinta años vendiendo chicles en el Metro: conozco esta ciudad como mi bolsillo.",
				"El que no conoce la ciudad, se la come la ciudad. Haz un recorrido conmigo.",
				"Ve al Ángel, sube al Castillo de Chapultepec y remata en Coyoacán. Usa el Metro: sale en cinco pesos.",
			} },
			{ Type = "GoTo", Pos = V(-880, 0, -200), Radius = 35, Label = "Visita el Ángel de la Independencia" },
			{ Type = "GoTo", Pos = V(-1170, 0, -330), Radius = 45, Label = "Sube al Castillo de Chapultepec" },
			{ Type = "GoTo", Pos = V(0, 0, 800), Radius = 30, Label = "Llega al Jardín Hidalgo, en Coyoacán" },
			{ Type = "Talk", Npc = "Chino", Lines = {
				"Quiubo. Tú has de ser el nuevo del que habla Doña Lupe.",
				"Yo soy El Chino. Aquí en Coyoacán todos me conocen.",
			} },
		},
	},
	-- 3 ---------------------------------------------------------------------
	{
		Title = "La banda del barrio",
		Reward = 300,
		Steps = {
			{ Type = "Talk", Npc = "Chino", Lines = {
				"En esta ciudad sin carro no eres nadie, carnal.",
				"Renta un Vochito junto al Palacio Nacional o cómprate algo en la Agencia Reforma.",
				"Luego ven manejando a Coyoacán y nos damos la vuelta.",
			} },
			{ Type = "GoTo", Pos = V(0, 0, 640), Radius = 30, Vehicle = true, Label = "Consigue un carro y llega manejando a Coyoacán" },
			{ Type = "Talk", Npc = "Chino", Lines = {
				"¡Así me gusta! Ya andas sobre ruedas.",
				"Oye... te tengo que contar algo. A Doña Lupe la andan extorsionando unos tipos: Los Tlacuaches.",
				"Le cobran \"piso\" cada semana. Ve a verla, anda bien espantada.",
			} },
		},
	},
	-- 4 ---------------------------------------------------------------------
	{
		Title = "Cobro de piso",
		Reward = 800,
		Steps = {
			{ Type = "Choice", Npc = "Lupe", Lines = {
				"Ay, mijo... vinieron otra vez. Si no pago cinco mil pesos el viernes, me queman el local.",
				"Treinta años con esta taquería. ¿Qué hago?",
			}, Options = {
				{ Text = "Vamos a la policía. Esto se arregla por la buena.", Path = "Honrado" },
				{ Text = "Déjelo en mis manos. El Chino y yo nos encargamos.", Path = "Chueco" },
			} },
			-- Camino honrado
			{ Path = "Honrado", Type = "Talk", Npc = "Ramirez", Lines = {
				"¿Los Tlacuaches? Llevamos meses tras ellos y nadie se atreve a denunciar.",
				"Si de verdad quieres ayudar, entra a la corporación. Date de alta como policía.",
				"Tu equipo está en la armería de la SSC, aquí junto a la entrada.",
			} },
			{ Path = "Honrado", Type = "Job", Job = "Policia", Label = "Date de alta como policía en la bolsa de trabajo [J]" },
			-- Camino chueco
			{ Path = "Chueco", Type = "Talk", Npc = "Chino", Lines = {
				"Así se habla. Pero sin fierro no hacemos nada.",
				"Ve con El Tuerto, en el tianguis de la Doctores. Dile que vas de mi parte.",
				"Y date de alta como ratero: esto no es chamba de oficina.",
			} },
			{ Path = "Chueco", Type = "Job", Job = "Ladron", Label = "Hazte ratero en la bolsa de trabajo [J]" },
			{ Path = "Chueco", Type = "Talk", Npc = "Tuerto", Lines = {
				"¿De parte del Chino? Pásale, pásale.",
				"Aquí tengo de todo, nomás que no se te ocurra decir dónde lo conseguiste.",
			} },
			-- Ambos caminos
			{ Type = "GoTo", Pos = V(520, 0, 470), Radius = 45, Label = "Llega a la bodega de Los Tlacuaches (Colonia Doctores)" },
			{ Type = "Defeat", Group = "Bodega", Label = "Vence a Los Tlacuaches de la bodega" },
			{ Path = "Honrado", Type = "Talk", Npc = "Ramirez", Lines = {
				"Buen trabajo, oficial. Entre las cajas encontramos libretas con todos los cobros.",
				"El que manda es un tal El Patrón. Vive en una mansión en Polanco.",
			} },
			{ Path = "Chueco", Type = "Talk", Npc = "Chino", Lines = {
				"¡Te rifaste, carnal! Y mira lo que había: la lana de todas las taquerías del Centro.",
				"Y una dirección en Polanco. Ahí vive el que manda: El Patrón.",
			} },
		},
	},
	-- 5 ---------------------------------------------------------------------
	{
		Title = "El Patrón",
		Reward = 3000,
		Steps = {
			{ Type = "GoTo", Pos = V(-960, 0, -440), Radius = 60, Label = "Ve a la mansión de El Patrón, en Polanco" },
			{ Type = "Defeat", Group = "Mansion", Label = "Derrota a El Patrón y a sus guardias" },
			{ Path = "Honrado", Type = "Talk", Npc = "Lupe", Lines = {
				"¡Saliste en las noticias, mijo! El Patrón ya está en el Reclusorio.",
				"El barrio respira otra vez. Eres un héroe... y aquí siempre tendrás tacos gratis.",
			}, Title = "Héroe del barrio" },
			{ Path = "Chueco", Type = "Talk", Npc = "Lupe", Lines = {
				"No sé qué hiciste... y no quiero saber.",
				"Pero ya nadie nos cobra piso. Gracias, mijo. Cuídate mucho, ¿eh?",
			}, Title = "Leyenda de la calle" },
		},
	},
}

-- Misiones repetibles de trabajo ---------------------------------------------
Story.DeliveryAddresses = {
	{ Name = "Depto. en la Roma", Pos = V(-560, 0, 420) },
	{ Name = "Oficina en Reforma", Pos = V(-620, 0, -240) },
	{ Name = "Casa en Coyoacán", Pos = V(120, 0, 700) },
	{ Name = "Hospital General", Pos = V(200, 0, 360) },
	{ Name = "Torre en Polanco", Pos = V(-850, 0, -480) },
	{ Name = "Base de taxis", Pos = V(200, 0, 520) },
	{ Name = "Condesa", Pos = V(-420, 0, 330) },
	{ Name = "Colonia Doctores", Pos = V(400, 0, 520) },
}

Story.BusRoute = { -- Ruta 2: Zócalo – Chapultepec (ida y vuelta)
	{ Name = "Zócalo", Pos = V(240, 0, -170) },
	{ Name = "Eje Central", Pos = V(-215, 0, -188) },
	{ Name = "Bellas Artes", Pos = V(-330, 0, -188) },
	{ Name = "Insurgentes", Pos = V(-670, 0, -188) },
	{ Name = "El Ángel", Pos = V(-830, 0, -188) },
	{ Name = "Chapultepec", Pos = V(-1030, 0, -188) },
	{ Name = "El Ángel (regreso)", Pos = V(-930, 0, -212) },
	{ Name = "Insurgentes (regreso)", Pos = V(-730, 0, -212) },
	{ Name = "Bellas Artes (regreso)", Pos = V(-360, 0, -212) },
	{ Name = "Zócalo (regreso)", Pos = V(220, 0, -212) },
}

return Story
