-- Weapons: armas genéricas (sin marcas reales) y dónde se consiguen.
-- Estilo realista sin sangre: los golpes muestran chispas y números de daño.

local Weapons = {}

-- Type: "Gun" (balas), "Melee" (cuerpo a cuerpo), "Taser" (paraliza)
-- Damage por bala; Pellets = balas por disparo (escopeta); Spread en grados.
-- Cooldown = segundos entre disparos; Auto = se mantiene presionado; Mag = cargador.
Weapons.List = {
	Macana = { Name = "Macana", Type = "Melee", Damage = 15, Range = 8, Cooldown = 0.7, Color = Color3.fromRGB(25, 25, 25), Size = Vector3.new(0.3, 0.3, 3) },
	Bat = { Name = "Bat de béisbol", Type = "Melee", Damage = 20, Range = 8, Cooldown = 0.9, Color = Color3.fromRGB(150, 105, 60), Size = Vector3.new(0.4, 0.4, 3.4) },
	Taser = { Name = "Taser", Type = "Taser", Range = 35, Cooldown = 2.5, Mag = 2, Reload = 2, Stun = 4, Spread = 0.5, Color = Color3.fromRGB(240, 200, 30), Size = Vector3.new(0.3, 0.8, 1.2) },
	Pistola = { Name = "Pistola 9 mm", Type = "Gun", Damage = 22, Range = 250, Cooldown = 0.25, Mag = 15, Reload = 1.6, Spread = 1.2, Color = Color3.fromRGB(35, 35, 38), Size = Vector3.new(0.3, 0.8, 1.4) },
	Revolver = { Name = "Revólver .38", Type = "Gun", Damage = 40, Range = 250, Cooldown = 0.6, Mag = 6, Reload = 2.4, Spread = 0.8, Color = Color3.fromRGB(150, 150, 155), Size = Vector3.new(0.3, 0.8, 1.6) },
	Escopeta = { Name = "Escopeta de bomba", Type = "Gun", Damage = 12, Pellets = 7, Range = 90, Cooldown = 0.95, Mag = 6, Reload = 3, Spread = 6, Color = Color3.fromRGB(90, 60, 35), Size = Vector3.new(0.35, 0.6, 3.6) },
	Subfusil = { Name = "Subfusil", Type = "Gun", Damage = 14, Range = 200, Cooldown = 0.09, Auto = true, Mag = 30, Reload = 2, Spread = 2.5, Color = Color3.fromRGB(40, 40, 45), Size = Vector3.new(0.35, 0.8, 2.2) },
	RifleSSC = { Name = "Rifle de asalto SSC", Type = "Gun", Damage = 24, Range = 350, Cooldown = 0.12, Auto = true, Mag = 30, Reload = 2.2, Spread = 1.5, Color = Color3.fromRGB(30, 35, 30), Size = Vector3.new(0.35, 0.8, 3.4) },
	Rifle = { Name = "Rifle de asalto", Type = "Gun", Damage = 24, Range = 350, Cooldown = 0.12, Auto = true, Mag = 30, Reload = 2.4, Spread = 2, Color = Color3.fromRGB(70, 55, 40), Size = Vector3.new(0.35, 0.8, 3.4) },
}

-- Tiendas de armas. Jobs = quién puede comprar ahí (nil = cualquiera).
Weapons.Shops = {
	Armeria = {
		Name = "Armería del Centro",
		Items = { { Id = "Bat", Price = 150 }, { Id = "Pistola", Price = 800 }, { Id = "Revolver", Price = 1200 }, { Id = "Escopeta", Price = 2500 } },
	},
	Tianguis = {
		Name = "El Tuerto · mercado negro",
		Jobs = { "Ladron" },
		Items = { { Id = "Pistola", Price = 600 }, { Id = "Subfusil", Price = 4500 }, { Id = "Rifle", Price = 9000 } },
	},
	SSC = {
		Name = "Armería de la SSC",
		Jobs = { "Policia" },
		Items = { { Id = "Macana", Price = 0 }, { Id = "Taser", Price = 0 }, { Id = "Pistola", Price = 0 }, { Id = "RifleSSC", Price = 0 } },
	},
}

function Weapons.Get(id)
	return Weapons.List[id]
end

return Weapons
