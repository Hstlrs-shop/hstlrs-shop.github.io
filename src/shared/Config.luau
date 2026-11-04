-- Configuración central de "CDMX Roleplay"
-- Cambia aquí sueldos, precios, estaciones, etc.

local Config = {}

Config.GAME_NAME = "CDMX Roleplay"
Config.CURRENCY = "$"
Config.STARTING_MONEY = 500
Config.PAYCHECK_INTERVAL = 60 -- segundos entre cada quincena (sueldo)
Config.DATASTORE_NAME = "CDMX_RP_v1"
Config.AUTOSAVE_INTERVAL = 120
Config.DAY_LENGTH_MINUTES = 20 -- duración de un día completo en el juego
Config.JOB_CHANGE_COOLDOWN = 10

-- Trabajos ------------------------------------------------------------------
-- Id: identificador interno. Team: nombre del equipo en la lista de jugadores.
Config.Jobs = {
	{
		Id = "Ciudadano",
		Name = "Ciudadano",
		Salary = 50,
		Color = "Medium stone grey",
		Description = "Vive la ciudad: pasea, come tacos y usa el Metro.",
	},
	{
		Id = "Policia",
		Name = "Policía (SSC)",
		Salary = 150,
		Color = "Navy blue",
		Description = "Patrulla la ciudad y arresta a los rateros buscados con tus esposas.",
	},
	{
		Id = "Paramedico",
		Name = "Paramédico (ERUM)",
		Salary = 140,
		Color = "Bright red",
		Description = "Cura a los heridos con tu botiquín. Ganas un bono por cada curación.",
	},
	{
		Id = "Taxista",
		Name = "Taxista",
		Salary = 100,
		Color = "Hot pink",
		Description = "Saca tu taxi rosa de la base y cobra a tus pasajeros por distancia.",
	},
	{
		Id = "Taquero",
		Name = "Taquero",
		Salary = 110,
		Color = "Bright orange",
		Description = "Quédate cerca de una taquería: ganas comisión por cada orden que se venda.",
	},
	{
		Id = "Vendedor",
		Name = "Vendedor ambulante",
		Salary = 80,
		Color = "Bright yellow",
		Description = "Quédate junto a un puesto: ganas comisión por cada elote, guajolota o churro vendido.",
	},
	{
		Id = "Repartidor",
		Name = "Repartidor",
		Salary = 70,
		Color = "Neon orange",
		Description = "Saca tu moto junto a la Taquería El Güero y entrega pedidos por la ciudad (+$60 por entrega).",
	},
	{
		Id = "Microbusero",
		Name = "Microbusero",
		Salary = 90,
		Color = "Sea green",
		Description = "Maneja el micro de la Ruta 2 (Zócalo – Chapultepec). Ganas $25 por cada parada.",
	},
	{
		Id = "Ladron",
		Name = "Ratero",
		Salary = 0,
		Color = "Really black",
		Description = "Asalta tienditas para ganar dinero... pero cuidado con la policía.",
	},
}

-- Tiendas y productos ------------------------------------------------------
-- Heal = vida que recupera al comerlo.
Config.Shops = {
	Taqueria = {
		Name = "Taquería",
		CommissionJob = "Taquero",
		Items = {
			{ Id = "Pastor", Name = "Tacos al pastor (orden)", Price = 45, Heal = 40, Color = "Bright orange" },
			{ Id = "Suadero", Name = "Tacos de suadero", Price = 40, Heal = 35, Color = "Reddish brown" },
			{ Id = "Quesadilla", Name = "Quesadilla (con o sin queso)", Price = 30, Heal = 25, Color = "Bright yellow" },
			{ Id = "Horchata", Name = "Agua de horchata", Price = 20, Heal = 15, Color = "Institutional white" },
		},
	},
	Puesto = {
		Name = "Puesto callejero",
		CommissionJob = "Vendedor",
		Items = {
			{ Id = "Elote", Name = "Elote con todo", Price = 30, Heal = 25, Color = "New Yeller" },
			{ Id = "Guajolota", Name = "Guajolota (torta de tamal)", Price = 25, Heal = 30, Color = "Brick yellow" },
			{ Id = "Churros", Name = "Churros con chocolate", Price = 35, Heal = 20, Color = "Nougat" },
			{ Id = "Esquite", Name = "Esquites", Price = 25, Heal = 20, Color = "Pastel yellow" },
		},
	},
	Tiendita = {
		Name = "Tiendita de la esquina",
		Items = {
			{ Id = "Refresco", Name = "Refresco", Price = 22, Heal = 10, Color = "Bright red" },
			{ Id = "Papitas", Name = "Papitas con chile", Price = 18, Heal = 10, Color = "Bright orange" },
			{ Id = "Gansito", Name = "Pastelito", Price = 15, Heal = 10, Color = "Pink" },
			{ Id = "Garrafon", Name = "Garrafón de agua", Price = 40, Heal = 35, Color = "Pastel light blue" },
		},
	},
}

-- Comisión que recibe el jugador con el trabajo indicado por cada venta.
Config.SALE_COMMISSION = 10

-- Metro ----------------------------------------------------------------------
Config.METRO_FARE = 5

-- Vehículos ------------------------------------------------------------------
-- El catálogo y los vehículos de trabajo están en Shared/Cars.luau
Config.TAXI_MIN_FARE = 15
Config.TAXI_FARE_PER_100_STUDS = 8

-- Crimen y policía ---------------------------------------------------------
Config.ROBBERY_MIN = 150
Config.ROBBERY_MAX = 400
Config.ROBBERY_COOLDOWN = 90 -- por tienda
Config.WANTED_DURATION = 180
Config.ARREST_REWARD = 250
Config.ARREST_RANGE = 10
Config.JAIL_TIME = 60

-- Combate -------------------------------------------------------------------
-- Las armas están en Shared/Weapons.luau
Config.HOSPITAL_FEE = 100 -- lo que cobra el hospital al reaparecer
Config.ASSAULT_WANTED = 120 -- segundos de búsqueda por atacar a alguien
Config.SAFE_ZONES = { -- aquí nadie recibe daño
	{ Name = "Zócalo", Center = Vector3.new(0, 0, 20), Radius = 95 },
	{ Name = "Hospital", Center = Vector3.new(160, 0, 400), Radius = 60 },
	{ Name = "Reclusorio", Center = Vector3.new(620, 0, -690), Radius = 95 },
}

-- Trabajos con misiones repetibles -----------------------------------------
Config.DELIVERY_PAY = 60
Config.DELIVERY_BONUS_PER_100 = 4
Config.BUS_STOP_PAY = 25

-- Paramédicos ----------------------------------------------------------------
Config.HEAL_AMOUNT = 50
Config.HEAL_REWARD = 40
Config.HEAL_RANGE = 10
Config.HEAL_COOLDOWN = 5

function Config.GetJob(id)
	for _, job in ipairs(Config.Jobs) do
		if job.Id == id then
			return job
		end
	end
	return nil
end

function Config.GetItem(shopId, itemId)
	local shop = Config.Shops[shopId]
	if not shop then
		return nil
	end
	for _, item in ipairs(shop.Items) do
		if item.Id == itemId then
			return item
		end
	end
	return nil
end

return Config
