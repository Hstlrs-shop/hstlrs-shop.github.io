-- Cars: catálogo de vehículos.
-- Los nombres son parodias de modelos reales: se reconocen, pero no usan las
-- marcas registradas (usar marcas reales puede hacer que Roblox retire el juego).

local Cars = {}

-- Carrocerías: medidas en studs. L = largo, W = ancho, BodyH = alto de la carrocería.
-- Roof = cabina abierta (techo + pilares): largo, posición Z del centro y altura.
Cars.Styles = {
	Sedan = { L = 15, W = 8, BodyH = 2.4, Roof = { L = 7.8, Z = 1, H = 4.2 }, Wheel = 3 },
	Hatch = { L = 13, W = 7.6, BodyH = 2.4, Roof = { L = 7.4, Z = 1.6, H = 4 }, Wheel = 2.8 },
	Pickup = { L = 17, W = 8.2, BodyH = 2.8, Roof = { L = 6, Z = -1.8, H = 4.2 }, Wheel = 3.4, Bed = true },
	SUV = { L = 16, W = 8.4, BodyH = 3, Roof = { L = 10.5, Z = 1.6, H = 4.6 }, Wheel = 3.4 },
	Sport = { L = 15, W = 8.2, BodyH = 2, Roof = { L = 6, Z = 1.4, H = 3.2 }, Wheel = 2.8 },
	Van = { L = 18, W = 8.4, BodyH = 3, Roof = { L = 14.5, Z = 1.4, H = 5.4 }, Wheel = 3.2 },
	Bus = { L = 30, W = 9, BodyH = 3, Roof = { L = 27, Z = 0.8, H = 6.5 }, Wheel = 3.6 },
	Moto = { L = 6, W = 2.2, BodyH = 1.6, Wheel = 2.6, Moto = true },
}

local function rgb(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local PAINT = {
	Blanco = rgb(240, 240, 240), Negro = rgb(25, 25, 28), Plata = rgb(180, 182, 188), Rojo = rgb(190, 30, 35),
	Azul = rgb(30, 70, 160), Verde = rgb(60, 140, 80), Amarillo = rgb(240, 200, 40), Gris = rgb(100, 102, 108),
	Vino = rgb(110, 20, 35), Naranja = rgb(235, 110, 30), Rosa = rgb(235, 80, 150), Arena = rgb(200, 180, 140),
}
Cars.Paint = PAINT
Cars.PaintOrder = { "Blanco", "Negro", "Plata", "Rojo", "Azul", "Verde", "Amarillo", "Gris", "Vino", "Naranja", "Rosa", "Arena" }

-- Catálogo de la Agencia Reforma ------------------------------------------
Cars.List = {
	{ Id = "Vochito", Name = "Volkswagon Vochito", Style = "Hatch", Price = 6000, MaxSpeed = 55, Seats = 4,
		Desc = "El escarabajo eterno. Lento, ruidoso y querido por todos." },
	{ Id = "Tsuro", Name = "Nizzan Tsuro", Style = "Sedan", Price = 8000, MaxSpeed = 65, Seats = 4,
		Desc = "El rey de la CDMX: taxi, carro familiar y leyenda." },
	{ Id = "Rion", Name = "Kya Rion", Style = "Hatch", Price = 14000, MaxSpeed = 70, Seats = 4,
		Desc = "Compacto, económico y fácil de estacionar en la Roma." },
	{ Id = "Avio", Name = "Chebrolet Avio", Style = "Sedan", Price = 12000, MaxSpeed = 68, Seats = 4,
		Desc = "El sedán de app de transporte por excelencia." },
	{ Id = "Versu", Name = "Nizzan Versu", Style = "Sedan", Price = 15000, MaxSpeed = 72, Seats = 4,
		Desc = "Sucesor espiritual del Tsuro. Más cómodo, igual de chilango." },
	{ Id = "Jeta", Name = "Volkswagon Jeta", Style = "Sedan", Price = 18000, MaxSpeed = 78, Seats = 4,
		Desc = "Clásico de la clase media. Aguanta todo." },
	{ Id = "Civik", Name = "Hondo Civik", Style = "Sedan", Price = 22000, MaxSpeed = 82, Seats = 4,
		Desc = "Confiable y rápido. Ideal para Periférico." },
	{ Id = "Hilox", Name = "Toyoda Hilox", Style = "Pickup", Price = 25000, MaxSpeed = 70, Seats = 2,
		Desc = "Pickup indestructible para la chamba pesada." },
	{ Id = "Lobo", Name = "Forb Lobo", Style = "Pickup", Price = 30000, MaxSpeed = 76, Seats = 2,
		Desc = "La troca norteña que también conquistó la capital." },
	{ Id = "Suburbia", Name = "Chebrolet Suburbia", Style = "SUV", Price = 45000, MaxSpeed = 75, Seats = 4,
		Desc = "Camionetota negra. Te abren paso en Polanco." },
	{ Id = "Serie3", Name = "BMV Serie 3", Style = "Sedan", Price = 70000, MaxSpeed = 95, Seats = 4,
		Desc = "Lujo alemán para llegar a Masaryk con estilo." },
	{ Id = "ClaseC", Name = "Merceditas Clase C", Style = "Sedan", Price = 85000, MaxSpeed = 95, Seats = 4,
		Desc = "Elegancia de la estrella... de parodia." },
	{ Id = "Uracan", Name = "Lamborjini Uracán", Style = "Sport", Price = 250000, MaxSpeed = 130, Seats = 1,
		Desc = "Para presumir en Reforma un domingo." },
	{ Id = "FT150", Name = "Itáliko FT-150", Style = "Moto", Price = 3500, MaxSpeed = 75, Seats = 1,
		Desc = "La moto de los repartidores. Se cuela entre el tráfico." },
}

-- Vehículos de trabajo (gratis para quien tenga el trabajo) -------------------
Cars.JobVehicles = {
	Taxi = { Name = "Taxi Nizzan Tsuro", Style = "Sedan", Job = "Taxista", MaxSpeed = 70, Seats = 4,
		Color = PAINT.Rosa, Accent = PAINT.Blanco, Sign = "TAXI", SideText = "CDMX" },
	Patrulla = { Name = "Patrulla Doge Chargher", Style = "Sedan", Job = "Policia", MaxSpeed = 90, Seats = 2,
		Color = PAINT.Blanco, Accent = rgb(20, 40, 110), Siren = { rgb(255, 30, 30), rgb(30, 80, 255) }, SideText = "POLICÍA" },
	Ambulancia = { Name = "Ambulancia ERUM", Style = "Van", Job = "Paramedico", MaxSpeed = 80, Seats = 2,
		Color = PAINT.Blanco, Accent = rgb(200, 30, 30), Siren = { rgb(255, 30, 30), rgb(255, 255, 255) }, SideText = "AMBULANCIA" },
	Micro = { Name = "Microbús Ruta 2", Style = "Bus", Job = "Microbusero", MaxSpeed = 55, Seats = 8,
		Color = rgb(70, 150, 90), Accent = rgb(220, 220, 215), SideText = "RUTA 2" },
	Reparto = { Name = "Moto de reparto", Style = "Moto", Job = "Repartidor", MaxSpeed = 75, Seats = 1,
		Color = rgb(235, 110, 30), Accent = PAINT.Negro },
	Vocho = { Name = "Vochito de renta", Style = "Hatch", Job = nil, Price = 100, MaxSpeed = 55, Seats = 4,
		Color = PAINT.Verde, Accent = PAINT.Blanco },
}

function Cars.Get(id)
	for _, car in ipairs(Cars.List) do
		if car.Id == id then
			return car
		end
	end
	return nil
end

return Cars
