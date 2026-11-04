-- MapBuilder: genera por código un mapa estilizado de la Ciudad de México.
-- No usa assets externos, así que funciona en cualquier lugar nuevo de Roblox.
-- Devuelve una tabla con los puntos de interés (tiendas, metro, garajes, cárcel).

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local MapBuilder = {}

local rng = Random.new(2026)
local root -- carpeta Workspace.CDMX
local reserved = {} -- rectángulos ocupados {x1, z1, x2, z2}

-- Paleta -------------------------------------------------------------------
local C = {
	Ground = Color3.fromRGB(160, 156, 148),
	Road = Color3.fromRGB(45, 45, 50),
	Line = Color3.fromRGB(240, 200, 40),
	Plaza = Color3.fromRGB(190, 180, 165),
	Grass = Color3.fromRGB(85, 140, 70),
	Stone = Color3.fromRGB(175, 155, 130),
	Tezontle = Color3.fromRGB(150, 60, 50),
	Marble = Color3.fromRGB(235, 230, 220),
	Gold = Color3.fromRGB(220, 180, 60),
	Glass = Color3.fromRGB(60, 95, 120),
	FlagGreen = Color3.fromRGB(0, 104, 71),
	FlagWhite = Color3.fromRGB(255, 255, 255),
	FlagRed = Color3.fromRGB(206, 17, 38),
	MetroOrange = Color3.fromRGB(240, 120, 20),
	Pink = Color3.fromRGB(235, 80, 150),
	Wood = Color3.fromRGB(110, 75, 45),
}

local PASTELS = {
	Color3.fromRGB(240, 170, 160), Color3.fromRGB(250, 210, 120), Color3.fromRGB(160, 210, 190),
	Color3.fromRGB(190, 170, 220), Color3.fromRGB(245, 140, 90), Color3.fromRGB(120, 180, 220),
	Color3.fromRGB(230, 110, 130), Color3.fromRGB(240, 230, 200), Color3.fromRGB(110, 170, 120),
}
local CENTRO = {
	Color3.fromRGB(175, 155, 130), Color3.fromRGB(150, 60, 50), Color3.fromRGB(200, 185, 160),
	Color3.fromRGB(190, 120, 80), Color3.fromRGB(220, 200, 170),
}
local GENERIC = {
	Color3.fromRGB(200, 200, 195), Color3.fromRGB(170, 165, 160), Color3.fromRGB(210, 190, 160),
	Color3.fromRGB(140, 150, 160), Color3.fromRGB(190, 175, 150), Color3.fromRGB(220, 215, 205),
}

-- Utilidades ---------------------------------------------------------------
local function folder(name, parent)
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent or root
	return f
end

local function part(name, size, cf, color, material, parent, shape)
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if shape then
		p.Shape = shape
	end
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Parent = parent or root
	return p
end

-- Cilindro vertical (los cilindros de Roblox tienen el eje en X)
local function vcyl(name, height, diameter, pos, color, material, parent)
	return part(name, Vector3.new(height, diameter, diameter),
		CFrame.new(pos) * CFrame.Angles(0, 0, math.rad(90)), color, material, parent, Enum.PartType.Cylinder)
end

local function ball(name, diameter, pos, color, material, parent)
	return part(name, Vector3.new(diameter, diameter, diameter), CFrame.new(pos), color, material, parent, Enum.PartType.Ball)
end

local function reserve(cx, cz, sx, sz)
	table.insert(reserved, { cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2 })
end

local function isFree(cx, cz, sx, sz, margin)
	local x1, z1, x2, z2 = cx - sx / 2 - margin, cz - sz / 2 - margin, cx + sx / 2 + margin, cz + sz / 2 + margin
	for _, r in ipairs(reserved) do
		if x1 < r[3] and x2 > r[1] and z1 < r[4] and z2 > r[2] then
			return false
		end
	end
	return true
end

local function surfaceText(target, text, bg, fg, faces)
	for _, face in ipairs(faces or { Enum.NormalId.Front }) do
		local sg = Instance.new("SurfaceGui")
		sg.Face = face
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 25
		sg.LightInfluence = 0.3
		local label = Instance.new("TextLabel")
		label.Size = UDim2.fromScale(1, 1)
		label.BackgroundColor3 = bg or Color3.new(0, 0, 0)
		label.BackgroundTransparency = bg and 0 or 1
		label.TextColor3 = fg or Color3.new(1, 1, 1)
		label.TextScaled = true
		label.Font = Enum.Font.GothamBlack
		label.Text = text
		label.Parent = sg
		sg.Parent = target
	end
end

local function billboard(target, text, color, offsetY, maxDistance)
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(260, 50)
	bb.StudsOffsetWorldSpace = Vector3.new(0, offsetY or 0, 0)
	bb.MaxDistance = maxDistance or 250
	bb.AlwaysOnTop = false
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.TextColor3 = color or Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.2
	label.TextScaled = true
	label.Font = Enum.Font.GothamBlack
	label.Text = text
	label.Parent = bb
	bb.Parent = target
	return bb
end

local function prompt(parent, action, object, hold, distance)
	local p = Instance.new("ProximityPrompt")
	p.ActionText = action
	p.ObjectText = object or ""
	p.HoldDuration = hold or 0
	p.MaxActivationDistance = distance or 12
	p.RequiresLineOfSight = false
	p.Parent = parent
	return p
end

local function tree(pos, parent)
	local h = rng:NextNumber(10, 16)
	vcyl("Tronco", h, 1.6, pos + Vector3.new(0, h / 2, 0), C.Wood, Enum.Material.Wood, parent)
	ball("Copa", rng:NextNumber(9, 13), pos + Vector3.new(0, h + 2, 0),
		Color3.fromRGB(60 + rng:NextInteger(0, 30), 120 + rng:NextInteger(0, 40), 50), Enum.Material.Grass, parent)
end

local function streetLight(pos, parent)
	local pole = vcyl("Poste", 16, 0.8, pos + Vector3.new(0, 8, 0), Color3.fromRGB(40, 40, 40), Enum.Material.Metal, parent)
	local lamp = part("Lampara", Vector3.new(2.4, 1, 2.4), CFrame.new(pos + Vector3.new(0, 16.4, 0)),
		Color3.fromRGB(255, 230, 170), Enum.Material.SmoothPlastic, parent)
	local light = Instance.new("PointLight")
	light.Range = 40
	light.Brightness = 1.5
	light.Color = Color3.fromRGB(255, 210, 150)
	light.Enabled = false
	light.Parent = lamp
	CollectionService:AddTag(lamp, "StreetLight")
	return pole
end

-- Terreno y calles -------------------------------------------------------
local ROADS_H = { -- z, x1, x2, ancho, nombre
	{ -200, -1050, 880, 40, "Paseo de la Reforma" },
	{ -540, -1250, 880, 30, "Av. Ejército Nacional" },
	{ 260, -1250, 880, 32, "Eje 2 Sur" },
	{ 620, -1250, 880, 32, "Av. Río Churubusco" },
}
local ROADS_V = { -- x, z1, z2, ancho, nombre
	{ -240, -780, 980, 36, "Eje Central" },
	{ 260, -780, 980, 36, "Av. Circunvalación" },
	{ -700, -780, 980, 34, "Av. Insurgentes" },
	{ 0, 90, 620, 30, "Av. 20 de Noviembre" },
}

local function buildGround()
	local f = folder("Suelo")
	for x = -1400, 1000, 600 do
		for z = -900, 1100, 600 do
			part("Banqueta", Vector3.new(600, 2, 600), CFrame.new(x + 300, -1, z + 300), C.Ground, Enum.Material.Pavement, f)
		end
	end
end

local function buildRoads()
	local f = folder("Calles")
	local lights = folder("Alumbrado")
	local function road(cx, cz, sx, sz, name, horizontal)
		local r = part(name, Vector3.new(sx, 0.4, sz), CFrame.new(cx, 0.2, cz), C.Road, Enum.Material.Asphalt, f)
		if horizontal then
			part("Linea", Vector3.new(sx, 0.05, 0.8), CFrame.new(cx, 0.425, cz), C.Line, Enum.Material.SmoothPlastic, f)
			for x = cx - sx / 2 + 20, cx + sx / 2 - 20, 90 do
				streetLight(Vector3.new(x, 0, cz - sz / 2 - 3), lights)
			end
		else
			part("Linea", Vector3.new(0.8, 0.05, sz), CFrame.new(cx, 0.425, cz), C.Line, Enum.Material.SmoothPlastic, f)
			for z = cz - sz / 2 + 20, cz + sz / 2 - 20, 90 do
				streetLight(Vector3.new(cx - sx / 2 - 3, 0, z), lights)
			end
		end
		reserve(cx, cz, sx, sz)
		return r
	end
	for _, h in ipairs(ROADS_H) do
		local len = h[3] - h[2]
		road((h[2] + h[3]) / 2, h[1], len, h[4], h[5], true)
	end
	for _, v in ipairs(ROADS_V) do
		local len = v[3] - v[2]
		road(v[1], (v[2] + v[3]) / 2, v[4], len, v[5], false)
	end
	-- Letreros de calles en algunos cruces
	for _, h in ipairs(ROADS_H) do
		for _, v in ipairs(ROADS_V) do
			if v[2] <= h[1] and v[3] >= h[1] and h[2] <= v[1] and h[3] >= v[1] then
				local pos = Vector3.new(v[1] + v[4] / 2 + 4, 0, h[1] + h[4] / 2 + 4)
				vcyl("PosteLetrero", 10, 0.5, pos + Vector3.new(0, 5, 0), Color3.fromRGB(40, 40, 40), Enum.Material.Metal, f)
				local s = part("Letrero", Vector3.new(14, 2.4, 0.3), CFrame.new(pos + Vector3.new(0, 10, 0)),
					Color3.fromRGB(20, 90, 50), Enum.Material.SmoothPlastic, f)
				surfaceText(s, h[5], Color3.fromRGB(20, 90, 50), Color3.new(1, 1, 1), { Enum.NormalId.Front, Enum.NormalId.Back })
			end
		end
	end
end

-- Monumentos -------------------------------------------------------------
local function buildZocalo()
	local f = folder("Zocalo")
	part("Plancha", Vector3.new(180, 0.3, 180), CFrame.new(0, 0.15, 0), C.Plaza, Enum.Material.Slate, f)
	reserve(0, 0, 180, 180)
	-- Asta bandera monumental
	vcyl("Base", 3, 14, Vector3.new(0, 1.5, 0), C.Stone, Enum.Material.Concrete, f)
	vcyl("Asta", 90, 1.4, Vector3.new(0, 45, 0), Color3.fromRGB(200, 200, 205), Enum.Material.Metal, f)
	local flagFolder = folder("Bandera", f)
	local w, h = 14, 24
	local baseCf = CFrame.new(0, 76, 0) * CFrame.Angles(0, math.rad(90), 0)
	part("Verde", Vector3.new(w, h, 0.4), baseCf * CFrame.new(-(0.7 + w * 0.5), 0, 0), C.FlagGreen, Enum.Material.Fabric, flagFolder)
	part("Blanco", Vector3.new(w, h, 0.4), baseCf * CFrame.new(-(0.7 + w * 1.5), 0, 0), C.FlagWhite, Enum.Material.Fabric, flagFolder)
	part("Rojo", Vector3.new(w, h, 0.4), baseCf * CFrame.new(-(0.7 + w * 2.5), 0, 0), C.FlagRed, Enum.Material.Fabric, flagFolder)
	part("Escudo", Vector3.new(5, 5, 0.6), baseCf * CFrame.new(-(0.7 + w * 1.5), 0, 0), Color3.fromRGB(130, 90, 40), Enum.Material.SmoothPlastic, flagFolder)
	billboard(f.Asta, "Zócalo - Plaza de la Constitución", Color3.fromRGB(255, 240, 200), 50, 400)

	-- Catedral Metropolitana (mira al sur, hacia el Zócalo)
	local cat = folder("Catedral", f)
	part("Nave", Vector3.new(90, 40, 60), CFrame.new(0, 20, -130), C.Stone, Enum.Material.Limestone, cat)
	part("Fachada", Vector3.new(40, 52, 4), CFrame.new(0, 26, -98), Color3.fromRGB(185, 165, 140), Enum.Material.Limestone, cat)
	part("Puerta", Vector3.new(10, 16, 1), CFrame.new(0, 8, -95.6), Color3.fromRGB(70, 45, 30), Enum.Material.Wood, cat)
	for _, x in ipairs({ -36, 36 }) do
		part("Torre", Vector3.new(18, 70, 18), CFrame.new(x, 35, -110), C.Stone, Enum.Material.Limestone, cat)
		part("Campanario", Vector3.new(14, 14, 14), CFrame.new(x, 77, -110), Color3.fromRGB(165, 145, 120), Enum.Material.Limestone, cat)
		ball("Cupula", 12, Vector3.new(x, 86, -110), Color3.fromRGB(150, 140, 125), Enum.Material.Limestone, cat)
		ball("Cruz", 2, Vector3.new(x, 93, -110), C.Gold, Enum.Material.Metal, cat)
	end
	ball("CupulaCentral", 28, Vector3.new(0, 42, -140), Color3.fromRGB(200, 190, 170), Enum.Material.Limestone, cat)
	reserve(0, -130, 90, 60)
	billboard(cat.Nave, "Catedral Metropolitana", Color3.fromRGB(255, 240, 200), 40, 300)

	-- Palacio Nacional (lado este)
	local pal = folder("PalacioNacional", f)
	part("Edificio", Vector3.new(70, 26, 180), CFrame.new(135, 13, 0), C.Tezontle, Enum.Material.Brick, pal)
	part("Cornisa", Vector3.new(72, 2, 182), CFrame.new(135, 26.5, 0), C.Stone, Enum.Material.Limestone, pal)
	part("Balcon", Vector3.new(3, 1, 120), CFrame.new(98.5, 14, 0), C.Stone, Enum.Material.Limestone, pal)
	for z = -80, 80, 16 do
		part("Ventana", Vector3.new(0.4, 7, 4), CFrame.new(99.8, 17, z), Color3.fromRGB(40, 35, 30), Enum.Material.SmoothPlastic, pal)
	end
	part("Campana", Vector3.new(8, 10, 8), CFrame.new(110, 31, 0), C.Stone, Enum.Material.Limestone, pal)
	reserve(135, 0, 70, 180)
	billboard(pal.Edificio, "Palacio Nacional", Color3.fromRGB(255, 240, 200), 20, 300)
end

local function buildCentroLandmarks()
	local f = folder("CentroHistorico")
	-- Torre Latinoamericana
	local torre = part("TorreLatinoamericana", Vector3.new(30, 180, 30), CFrame.new(-180, 90, -120), C.Glass, Enum.Material.Glass, f)
	for y = 10, 175, 12 do
		part("Franja", Vector3.new(30.4, 1.2, 30.4), CFrame.new(-180, y, -120), Color3.fromRGB(150, 155, 160), Enum.Material.Metal, f)
	end
	vcyl("Antena", 40, 1.5, Vector3.new(-180, 200, -120), Color3.fromRGB(200, 200, 200), Enum.Material.Metal, f)
	reserve(-180, -120, 30, 30)
	billboard(torre, "Torre Latinoamericana", Color3.new(1, 1, 1), 100, 600)

	-- Palacio de Bellas Artes
	local ba = folder("BellasArtes", f)
	part("Cuerpo", Vector3.new(70, 30, 50), CFrame.new(-330, 15, -120), C.Marble, Enum.Material.Marble, ba)
	part("Escalinata", Vector3.new(40, 2, 8), CFrame.new(-330, 1, -91), C.Marble, Enum.Material.Marble, ba)
	ball("CupulaCentral", 32, Vector3.new(-330, 36, -120), Color3.fromRGB(225, 130, 40), Enum.Material.Metal, ba)
	ball("Remate", 5, Vector3.new(-330, 54, -120), C.Gold, Enum.Material.Metal, ba)
	for _, x in ipairs({ -356, -304 }) do
		ball("CupulaLateral", 14, Vector3.new(x, 32, -120), Color3.fromRGB(225, 130, 40), Enum.Material.Metal, ba)
	end
	reserve(-330, -120, 70, 58)
	billboard(ba.Cuerpo, "Palacio de Bellas Artes", Color3.fromRGB(255, 240, 200), 40, 300)

	-- Alameda Central
	local al = folder("Alameda", f)
	part("Pasto", Vector3.new(150, 0.4, 100), CFrame.new(-490, 0.2, -110), C.Grass, Enum.Material.Grass, al)
	vcyl("Fuente", 2, 20, Vector3.new(-490, 1.2, -110), Color3.fromRGB(80, 160, 220), Enum.Material.Glass, al)
	vcyl("Hemiciclo", 12, 6, Vector3.new(-490, 6, -150), C.Marble, Enum.Material.Marble, al)
	for i = 1, 18 do
		tree(Vector3.new(rng:NextNumber(-560, -420), 0, rng:NextNumber(-155, -65)), al)
	end
	reserve(-490, -110, 150, 100)
end

local function buildReforma()
	local f = folder("Reforma")
	-- Ángel de la Independencia en una glorieta sobre Reforma
	local x, z = -880, -200
	vcyl("Glorieta", 0.6, 44, Vector3.new(x, 0.5, z), C.Grass, Enum.Material.Grass, f)
	vcyl("Pedestal", 8, 18, Vector3.new(x, 4, z), C.Stone, Enum.Material.Limestone, f)
	vcyl("Columna", 90, 6, Vector3.new(x, 53, z), Color3.fromRGB(215, 205, 185), Enum.Material.Marble, f)
	vcyl("Capitel", 4, 9, Vector3.new(x, 100, z), C.Gold, Enum.Material.Metal, f)
	local angel = ball("Angel", 5, Vector3.new(x, 105, z), C.Gold, Enum.Material.Metal, f)
	part("AlaIzq", Vector3.new(6, 4, 0.5), CFrame.new(x - 3, 107, z) * CFrame.Angles(0, 0, math.rad(25)), C.Gold, Enum.Material.Metal, f)
	part("AlaDer", Vector3.new(6, 4, 0.5), CFrame.new(x + 3, 107, z) * CFrame.Angles(0, 0, math.rad(-25)), C.Gold, Enum.Material.Metal, f)
	billboard(angel, "El Ángel de la Independencia", C.Gold, 8, 500)
	-- Camellón arbolado
	for tx = -1030, -280, 60 do
		if math.abs(tx - x) > 40 then
			tree(Vector3.new(tx, 0, -200 - 24), f)
		end
	end
end

local function buildChapultepec()
	local f = folder("Chapultepec")
	local cx, cz, sx, sz = -1155, -205, 190, 610
	part("Bosque", Vector3.new(sx, 0.4, sz), CFrame.new(cx, 0.2, cz), C.Grass, Enum.Material.Grass, f)
	reserve(cx, cz, sx, sz)
	-- Cerro y castillo
	ball("Cerro", 150, Vector3.new(-1170, -38, -330), Color3.fromRGB(95, 125, 70), Enum.Material.Grass, f)
	local castle = part("Castillo", Vector3.new(60, 18, 36), CFrame.new(-1170, 45, -330), Color3.fromRGB(225, 215, 195), Enum.Material.Limestone, f)
	part("Torre", Vector3.new(14, 30, 14), CFrame.new(-1150, 51, -330), Color3.fromRGB(225, 215, 195), Enum.Material.Limestone, f)
	part("Bandera", Vector3.new(0.3, 4, 6), CFrame.new(-1150, 70, -327), C.FlagGreen, Enum.Material.Fabric, f)
	billboard(castle, "Castillo de Chapultepec", Color3.fromRGB(255, 240, 200), 30, 500)
	-- Lago
	part("Lago", Vector3.new(70, 0.6, 110), CFrame.new(-1170, 0.3, -20), Color3.fromRGB(70, 140, 190), Enum.Material.Glass, f)
	for i = 1, 60 do
		local px, pz = rng:NextNumber(cx - sx / 2 + 6, cx + sx / 2 - 6), rng:NextNumber(cz - sz / 2 + 6, cz + sz / 2 - 6)
		local nearHill = (Vector2.new(px, pz) - Vector2.new(-1170, -330)).Magnitude < 80
		local inLake = math.abs(px + 1170) < 40 and math.abs(pz + 20) < 60
		if not nearHill and not inLake then
			tree(Vector3.new(px, 0, pz), f)
		end
	end
end

local function buildRoma()
	local f = folder("RomaCondesa")
	-- Parque México
	local px, pz = -470, 440
	vcyl("Parque", 0.4, 120, Vector3.new(px, 0.2, pz), C.Grass, Enum.Material.Grass, f)
	vcyl("Foro", 1.5, 26, Vector3.new(px, 0.75, pz), C.Plaza, Enum.Material.Concrete, f)
	for i = 1, 16 do -- árboles del parque
		local a = rng:NextNumber(0, math.pi * 2)
		local r = rng:NextNumber(20, 55)
		tree(Vector3.new(px + math.cos(a) * r, 0, pz + math.sin(a) * r), f)
	end
	reserve(px, pz, 130, 130)
	billboard(f.Foro, "Parque México (Condesa)", Color3.new(1, 1, 1), 12, 200)
end

local function buildCoyoacan()
	local f = folder("Coyoacan")
	part("Jardin", Vector3.new(160, 0.3, 120), CFrame.new(0, 0.15, 800), C.Plaza, Enum.Material.Cobblestone, f)
	reserve(0, 800, 160, 120)
	-- Kiosko
	vcyl("Base", 2, 22, Vector3.new(0, 1, 800), C.Stone, Enum.Material.Concrete, f)
	for i = 0, 5 do
		local a = math.rad(i * 60)
		vcyl("Columna", 12, 1, Vector3.new(math.cos(a) * 9, 8, 800 + math.sin(a) * 9), Color3.fromRGB(40, 120, 70), Enum.Material.Metal, f)
	end
	local roof = vcyl("Techo", 2, 24, Vector3.new(0, 15, 800), Color3.fromRGB(40, 120, 70), Enum.Material.Metal, f)
	ball("Remate", 6, Vector3.new(0, 17, 800), Color3.fromRGB(40, 120, 70), Enum.Material.Metal, f)
	billboard(roof, "Jardín Hidalgo - Coyoacán", Color3.fromRGB(255, 240, 200), 10, 250)
	-- Parroquia
	part("Parroquia", Vector3.new(40, 26, 50), CFrame.new(0, 13, 905), Color3.fromRGB(225, 190, 120), Enum.Material.Limestone, f)
	part("Torre", Vector3.new(12, 44, 12), CFrame.new(-22, 22, 885), Color3.fromRGB(225, 190, 120), Enum.Material.Limestone, f)
	reserve(0, 905, 52, 50)
	-- La Casa Azul
	local casa = part("CasaAzul", Vector3.new(40, 16, 30), CFrame.new(180, 8, 900), Color3.fromRGB(30, 80, 200), Enum.Material.Plaster, f)
	part("Puerta", Vector3.new(6, 10, 0.5), CFrame.new(180, 5, 884.8), Color3.fromRGB(200, 40, 60), Enum.Material.Wood, f)
	billboard(casa, "La Casa Azul", Color3.fromRGB(120, 180, 255), 12, 200)
	reserve(180, 900, 40, 30)
	for i = 1, 20 do
		local tx, tz = rng:NextNumber(-75, 75), rng:NextNumber(745, 855)
		if Vector2.new(tx, tz - 800).Magnitude > 20 and Vector2.new(tx - 60, tz - 780).Magnitude > 10 then
			tree(Vector3.new(tx, 0, tz), f)
		end
	end
end

-- Edificios de servicio ----------------------------------------------------
-- Cada uno se orienta con un CFrame; el frente (-Z local) mira a la calle.
local function serviceBuilding(name, cf, size, color, signText, signBg, parent)
	local f = folder(name, parent)
	local body = part("Edificio", size, cf * CFrame.new(0, size.Y / 2, 0), color, Enum.Material.Concrete, f)
	local sign = part("Letrero", Vector3.new(size.X * 0.8, 5, 0.6),
		cf * CFrame.new(0, size.Y - 4, -size.Z / 2 - 0.4), signBg, Enum.Material.SmoothPlastic, f)
	surfaceText(sign, signText, signBg, Color3.new(1, 1, 1))
	part("Entrada", Vector3.new(8, 10, 0.4), cf * CFrame.new(0, 5, -size.Z / 2 - 0.2), Color3.fromRGB(60, 80, 100), Enum.Material.Glass, f)
	local p = cf.Position
	reserve(p.X, p.Z, math.max(size.X, size.Z), math.max(size.X, size.Z))
	return f, body
end

local function facing(x, z, dirX, dirZ)
	local pos = Vector3.new(x, 0, z)
	return CFrame.lookAt(pos, pos + Vector3.new(dirX, 0, dirZ))
end

local function garage(map, kind, label, color, promptPos, spawnCf, parent)
	local pad = part("Garaje_" .. kind, Vector3.new(16, 0.2, 24), spawnCf * CFrame.new(0, 0.5, 0) - Vector3.new(0, spawnCf.Position.Y, 0),
		color, Enum.Material.SmoothPlastic, parent)
	pad.CanCollide = false
	pad.Transparency = 0.4
	local post = part("Kiosco_" .. kind, Vector3.new(2, 6, 2), CFrame.new(promptPos + Vector3.new(0, 3, 0)), color, Enum.Material.SmoothPlastic, parent)
	billboard(post, label, Color3.new(1, 1, 1), 5, 80)
	local pr = prompt(post, "Sacar vehículo", label, 0.5)
	table.insert(map.Garages, { Kind = kind, Prompt = pr, SpawnCFrame = spawnCf })
end

local function buildServices(map)
	local f = folder("Servicios")
	-- SSC (Policía)
	serviceBuilding("SSC", facing(380, 100, 0, 1), Vector3.new(80, 24, 60), Color3.fromRGB(230, 230, 235),
		"SSC - POLICÍA CDMX", Color3.fromRGB(20, 40, 110), f)
	garage(map, "Patrulla", "Patrullas", Color3.fromRGB(20, 40, 110), Vector3.new(350, 0, 160),
		CFrame.new(380, 3, 175) * CFrame.Angles(0, math.rad(90), 0), f)
	-- Hospital
	local _, hosp = serviceBuilding("Hospital", facing(130, 400, 1, 0), Vector3.new(80, 30, 60), Color3.fromRGB(245, 245, 245),
		"HOSPITAL GENERAL", Color3.fromRGB(200, 30, 30), f)
	part("Cruz1", Vector3.new(4, 14, 0.6), hosp.CFrame * CFrame.new(-20, 6, -30.4), Color3.fromRGB(200, 30, 30), Enum.Material.Neon, f)
	part("Cruz2", Vector3.new(14, 4, 0.6), hosp.CFrame * CFrame.new(-20, 6, -30.4), Color3.fromRGB(200, 30, 30), Enum.Material.Neon, f)
	garage(map, "Ambulancia", "Ambulancias", Color3.fromRGB(200, 30, 30), Vector3.new(190, 0, 360),
		CFrame.new(215, 3, 400), f)
	-- Base de taxis
	serviceBuilding("BaseTaxis", facing(130, 540, 1, 0), Vector3.new(50, 14, 40), C.Pink,
		"BASE DE TAXIS", Color3.fromRGB(240, 240, 240), f)
	garage(map, "Taxi", "Taxis CDMX", C.Pink, Vector3.new(190, 0, 510), CFrame.new(215, 3, 545), f)
	-- Renta de vochos junto al Zócalo
	garage(map, "Vocho", "Renta de Vochos $100", Color3.fromRGB(80, 160, 90), Vector3.new(200, 0, -60),
		CFrame.new(215, 3, -20), f)
	reserve(215, -40, 50, 60)
	reserve(205, 400, 40, 40)
	reserve(205, 530, 40, 50)
	reserve(370, 170, 50, 30)
end

local function buildJail(map)
	local f = folder("Reclusorio")
	local cx, cz, size, wallH = 620, -690, 150, 30
	part("Patio", Vector3.new(size, 0.4, size), CFrame.new(cx, 0.2, cz), Color3.fromRGB(120, 120, 120), Enum.Material.Concrete, f)
	local wallColor = Color3.fromRGB(110, 110, 115)
	part("MuroN", Vector3.new(size, wallH, 4), CFrame.new(cx, wallH / 2, cz - size / 2), wallColor, Enum.Material.Concrete, f)
	part("MuroS", Vector3.new(size, wallH, 4), CFrame.new(cx, wallH / 2, cz + size / 2), wallColor, Enum.Material.Concrete, f)
	part("MuroE", Vector3.new(4, wallH, size), CFrame.new(cx + size / 2, wallH / 2, cz), wallColor, Enum.Material.Concrete, f)
	part("MuroO", Vector3.new(4, wallH, size), CFrame.new(cx - size / 2, wallH / 2, cz), wallColor, Enum.Material.Concrete, f)
	-- Techo invisible para que nadie escape saltando
	local roof = part("TechoInvisible", Vector3.new(size, 2, size), CFrame.new(cx, wallH + 1, cz), wallColor, Enum.Material.Concrete, f)
	roof.Transparency = 1
	local sign = part("Letrero", Vector3.new(60, 8, 1), CFrame.new(cx, wallH - 6, cz + size / 2 + 2.6), Color3.fromRGB(30, 30, 30), Enum.Material.SmoothPlastic, f)
	surfaceText(sign, "RECLUSORIO", Color3.fromRGB(30, 30, 30), Color3.fromRGB(255, 80, 80), { Enum.NormalId.Back })
	for i = -2, 2 do
		part("Celda", Vector3.new(1, 12, 20), CFrame.new(cx + i * 22 + 11, 6, cz - 50), Color3.fromRGB(70, 70, 70), Enum.Material.Metal, f)
	end
	reserve(cx, cz, size + 10, size + 10)
	map.JailCenter = Vector3.new(cx, 4, cz)
	map.JailRadius = 40
end

-- Comercios --------------------------------------------------------------
local function taqueria(map, name, cf, parent)
	local f = folder("Taqueria_" .. name, parent)
	part("Local", Vector3.new(30, 14, 22), cf * CFrame.new(0, 7, 0), Color3.fromRGB(245, 150, 60), Enum.Material.Plaster, f)
	local sign = part("Letrero", Vector3.new(26, 4, 0.6), cf * CFrame.new(0, 12, -11.4), Color3.fromRGB(200, 30, 60), Enum.Material.SmoothPlastic, f)
	surfaceText(sign, "TAQUERÍA " .. string.upper(name), Color3.fromRGB(200, 30, 60), Color3.fromRGB(255, 240, 120))
	local counter = part("Barra", Vector3.new(18, 4, 3), cf * CFrame.new(0, 2, -13), Color3.fromRGB(240, 240, 240), Enum.Material.Tile, f)
	-- El trompo del pastor
	vcyl("Trompo", 6, 3, (cf * CFrame.new(6, 7, -13)).Position, Color3.fromRGB(170, 70, 30), Enum.Material.SmoothPlastic, f)
	ball("Pina", 2, (cf * CFrame.new(6, 10.6, -13)).Position, Color3.fromRGB(240, 200, 40), Enum.Material.SmoothPlastic, f)
	local pr = prompt(counter, "Pedir comida", "Taquería " .. name)
	table.insert(map.Shops, { ShopId = "Taqueria", Prompt = pr, Part = counter })
	local p = cf.Position
	reserve(p.X, p.Z, 34, 34)
end

local function tiendita(map, name, cf, parent)
	local f = folder("Tiendita_" .. name, parent)
	part("Local", Vector3.new(24, 12, 20), cf * CFrame.new(0, 6, 0), Color3.fromRGB(250, 220, 90), Enum.Material.Plaster, f)
	local sign = part("Letrero", Vector3.new(22, 3.5, 0.6), cf * CFrame.new(0, 10, -10.4), Color3.fromRGB(200, 30, 30), Enum.Material.SmoothPlastic, f)
	surfaceText(sign, string.upper(name), Color3.fromRGB(200, 30, 30), Color3.new(1, 1, 1))
	local counter = part("Mostrador", Vector3.new(10, 4, 3), cf * CFrame.new(-4, 2, -12), Color3.fromRGB(150, 110, 70), Enum.Material.Wood, f)
	local register = part("Caja", Vector3.new(2, 1.5, 1.5), cf * CFrame.new(4, 4.75, -12), Color3.fromRGB(60, 60, 60), Enum.Material.Metal, f)
	part("BaseCaja", Vector3.new(4, 4, 3), cf * CFrame.new(4, 2, -12), Color3.fromRGB(150, 110, 70), Enum.Material.Wood, f)
	local buy = prompt(counter, "Comprar", name)
	table.insert(map.Shops, { ShopId = "Tiendita", Prompt = buy, Part = counter })
	local rob = prompt(register, "Asaltar", "Caja registradora", 4, 8)
	rob.KeyboardKeyCode = Enum.KeyCode.F
	rob.UIOffset = Vector2.new(0, 60)
	table.insert(map.Robbables, { Name = name, Prompt = rob, Part = register })
	local p = cf.Position
	reserve(p.X, p.Z, 28, 30)
end

local function puesto(map, name, pos, parent)
	local f = folder("Puesto_" .. name, parent)
	local cart = part("Carrito", Vector3.new(8, 4, 4), CFrame.new(pos + Vector3.new(0, 2, 0)), Color3.fromRGB(240, 240, 240), Enum.Material.Metal, f)
	vcyl("Poste", 8, 0.4, pos + Vector3.new(0, 7, 0), Color3.fromRGB(60, 60, 60), Enum.Material.Metal, f)
	vcyl("Sombrilla", 0.6, 12, pos + Vector3.new(0, 11, 0), rng:NextInteger(0, 1) == 0 and C.Pink or Color3.fromRGB(240, 120, 20), Enum.Material.Fabric, f)
	local pr = prompt(cart, "Comprar", "Puesto " .. name)
	table.insert(map.Shops, { ShopId = "Puesto", Prompt = pr, Part = cart })
	reserve(pos.X, pos.Z, 14, 14)
end

local function metroStation(map, name, cf, parent)
	local f = folder("Metro_" .. name, parent)
	part("Acceso", Vector3.new(16, 9, 12), cf * CFrame.new(0, 4.5, 0), Color3.fromRGB(60, 60, 65), Enum.Material.Concrete, f)
	part("Franja", Vector3.new(16.4, 1.5, 12.4), cf * CFrame.new(0, 8.25, 0), C.MetroOrange, Enum.Material.SmoothPlastic, f)
	local door = part("Escaleras", Vector3.new(8, 7, 0.4), cf * CFrame.new(0, 3.5, -6.1), Color3.fromRGB(20, 20, 20), Enum.Material.SmoothPlastic, f)
	vcyl("PosteM", 14, 0.6, (cf * CFrame.new(10, 7, -4)).Position, Color3.fromRGB(60, 60, 60), Enum.Material.Metal, f)
	local logo = part("LogoM", Vector3.new(5, 5, 0.6), cf * CFrame.new(10, 15, -4), C.MetroOrange, Enum.Material.SmoothPlastic, f)
	surfaceText(logo, "M", C.MetroOrange, Color3.new(1, 1, 1), { Enum.NormalId.Front, Enum.NormalId.Back })
	billboard(f.Acceso, "Metro " .. name, Color3.fromRGB(255, 170, 60), 9, 150)
	local pr = prompt(door, "Tomar el Metro ($" .. Config.METRO_FARE .. ")", "Metro " .. name)
	table.insert(map.Stations, { Name = name, Prompt = pr, Part = door, Arrival = cf * CFrame.new(0, 4, -12) })
	local p = cf.Position
	reserve(p.X, p.Z, 22, 22)
end

local function buildCommerce(map)
	local f = folder("Comercios")
	-- Taquerías
	taqueria(map, "El Güero", facing(-110, 170, 1, 0), f)
	taqueria(map, "La Roma", facing(-600, 330, 0, -1), f)
	taqueria(map, "Coyoacán", facing(-140, 720, 1, 0), f)
	-- Tienditas (se pueden asaltar)
	tiendita(map, "Miscelánea Don Pepe", facing(380, 380, -1, 0), f)
	tiendita(map, "Abarrotes La Güera", facing(-600, 560, 0, -1), f)
	tiendita(map, "Miscelánea La Esperanza", facing(500, -300, 0, 1), f)
	tiendita(map, "Tiendita Polanco", facing(-900, -380, 0, 1), f)
	-- Puestos callejeros
	puesto(map, "del Zócalo", Vector3.new(-70, 0.3, 60), f)
	puesto(map, "de la Catedral", Vector3.new(70, 0.3, 60), f)
	puesto(map, "de la Alameda", Vector3.new(-490, 0, -45), f)
	puesto(map, "de Coyoacán", Vector3.new(60, 0.3, 780), f)
	puesto(map, "del Parque México", Vector3.new(-470, 0, 525), f)
	-- Metro
	metroStation(map, "Zócalo", facing(-70, -60, 0, 1), f)
	metroStation(map, "Bellas Artes", facing(-330, -75, 0, 1), f)
	metroStation(map, "Insurgentes", facing(-660, 300, 1, 0), f)
	metroStation(map, "Chapultepec", facing(-1030, -150, 1, 0), f)
	metroStation(map, "Polanco", facing(-860, -300, 0, 1), f)
	metroStation(map, "Coyoacán", facing(110, 760, -1, 0), f)
end

-- Relleno de edificios por colonia ------------------------------------------
local function districtStyle(x, z)
	if x < -720 and z < -225 then
		return "Polanco"
	elseif x > -690 and x < -255 and z > 278 and z < 605 then
		return "Roma"
	elseif z > 636 then
		return "Coyoacan"
	elseif x > -690 and x < 700 and z < 278 then
		return "Centro"
	end
	return "Generico"
end

local function genericBuilding(x, z, w, d, style, parent)
	local h, color, material, bandColor
	if style == "Polanco" then
		h = rng:NextNumber(60, 150)
		color = Color3.fromRGB(70 + rng:NextInteger(0, 40), 100 + rng:NextInteger(0, 40), 120 + rng:NextInteger(0, 40))
		material = Enum.Material.Glass
		bandColor = Color3.fromRGB(190, 195, 200)
	elseif style == "Roma" then
		h = rng:NextNumber(16, 36)
		color = PASTELS[rng:NextInteger(1, #PASTELS)]
		material = Enum.Material.Plaster
		bandColor = Color3.fromRGB(50, 60, 70)
	elseif style == "Coyoacan" then
		h = rng:NextNumber(12, 20)
		color = PASTELS[rng:NextInteger(1, #PASTELS)]
		material = Enum.Material.Plaster
		bandColor = Color3.fromRGB(60, 45, 35)
	elseif style == "Centro" then
		h = rng:NextNumber(22, 45)
		color = CENTRO[rng:NextInteger(1, #CENTRO)]
		material = Enum.Material.Limestone
		bandColor = Color3.fromRGB(45, 40, 35)
	else
		h = rng:NextNumber(24, 70)
		color = GENERIC[rng:NextInteger(1, #GENERIC)]
		material = Enum.Material.Concrete
		bandColor = Color3.fromRGB(55, 75, 95)
	end
	local m = Instance.new("Model")
	m.Name = "Edificio"
	part("Cuerpo", Vector3.new(w, h, d), CFrame.new(x, h / 2, z), color, material, m)
	local bands = 0
	for y = 7, h - 4, 10 do
		part("Ventanas", Vector3.new(w + 0.3, 3, d + 0.3), CFrame.new(x, y, z), bandColor, Enum.Material.Glass, m)
		bands = bands + 1
		if bands >= 12 then
			break
		end
	end
	if style ~= "Polanco" and rng:NextNumber() < 0.4 then
		-- Tinaco en la azotea, infaltable en la CDMX
		vcyl("Tinaco", 4, 3.5, Vector3.new(x + w / 4, h + 2, z + d / 4), Color3.fromRGB(30, 30, 30), Enum.Material.Plastic, m)
	end
	m.Parent = parent
end

local function fillBuildings()
	local f = folder("Edificios")
	local step = 85
	for x = -1240, 860, step do
		for z = -770, 970, step do
			if rng:NextNumber() < 0.8 then
				local w, d = rng:NextNumber(30, 55), rng:NextNumber(30, 55)
				local ox, oz = rng:NextNumber(-8, 8), rng:NextNumber(-8, 8)
				local cx, cz = x + ox, z + oz
				if isFree(cx, cz, w, d, 8) then
					genericBuilding(cx, cz, w, d, districtStyle(cx, cz), f)
					reserve(cx, cz, w, d)
				end
			end
		end
	end
end

-- Spawn ------------------------------------------------------------------
local function buildSpawn(map)
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "SpawnZocalo"
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Size = Vector3.new(14, 1, 14)
	spawn.CFrame = CFrame.new(0, 0.5, 45)
	spawn.Color = C.FlagGreen
	spawn.Material = Enum.Material.SmoothPlastic
	spawn.Duration = 3
	spawn.Parent = root
	map.Spawn = spawn
	map.ReleaseCFrame = CFrame.new(0, 4, 45)
end

function MapBuilder.Build()
	local existing = workspace:FindFirstChild("CDMX")
	if existing then
		existing:Destroy()
	end
	-- Quitamos el Baseplate y los spawns de la plantilla por defecto
	for _, child in ipairs(workspace:GetChildren()) do
		if child.Name == "Baseplate" or child:IsA("SpawnLocation") then
			child:Destroy()
		end
	end
	root = Instance.new("Folder")
	root.Name = "CDMX"

	local map = { Shops = {}, Robbables = {}, Stations = {}, Garages = {} }

	buildGround()
	buildRoads()
	buildZocalo()
	buildCentroLandmarks()
	buildReforma()
	buildChapultepec()
	buildRoma()
	buildCoyoacan()
	buildServices(map)
	buildJail(map)
	buildCommerce(map)
	buildSpawn(map)
	fillBuildings()

	root.Parent = workspace
	return map
end

return MapBuilder
