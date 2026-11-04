-- Vehicles: autos de trabajo, renta, agencia de autos y garage personal.
-- El conductor maneja desde el cliente (ver client/Driving.luau); aquí se
-- construyen los autos, se controla quién maneja y se cobra el taxi.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)
local Cars = require(ReplicatedStorage.Shared.Cars)

local Vehicles = {}

local ctx
local owned = {} -- [player] = Model (solo un vehículo activo por jugador)
local carsFolder

-- Construcción -----------------------------------------------------------------
local function weld(base, p)
	local w = Instance.new("WeldConstraint")
	w.Part0 = base
	w.Part1 = p
	w.Parent = p
end

local function addPart(model, base, name, size, offset, color, material, collide)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = base.CFrame * offset
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.CanCollide = collide or false
	p.Massless = true
	weld(base, p)
	p.Parent = model
	return p
end

local function sideText(part, text, color)
	for _, face in ipairs({ Enum.NormalId.Left, Enum.NormalId.Right }) do
		local sg = Instance.new("SurfaceGui")
		sg.Face = face
		sg.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		sg.PixelsPerStud = 30
		local l = Instance.new("TextLabel")
		l.Size = UDim2.fromScale(1, 1)
		l.BackgroundTransparency = 1
		l.TextScaled = true
		l.Font = Enum.Font.GothamBlack
		l.TextColor3 = color
		l.Text = text
		l.Parent = sg
		sg.Parent = part
	end
end

local function addSeat(model, base, className, name, offset)
	local s = Instance.new(className)
	s.Name = name
	s.Size = Vector3.new(2, 1, 2)
	s.CFrame = base.CFrame * offset
	s.Color = Color3.fromRGB(40, 40, 40)
	s.Massless = true
	weld(base, s)
	s.Parent = model
	return s
end

-- spec: { Name, Style, Color, Accent, MaxSpeed, Seats, Sign?, Siren?, SideText? }
-- Devuelve model, base, driverSeat, passengerSeats
function Vehicles.Build(spec, cf, owner, anchoredDisplay)
	local st = Cars.Styles[spec.Style] or Cars.Styles.Sedan
	local L, W, H = st.L, st.W, st.BodyH
	local model = Instance.new("Model")
	model.Name = owner and (spec.Name .. " de " .. owner.DisplayName) or spec.Name

	local base = Instance.new("Part")
	base.Name = "Base"
	base.Size = st.Moto and Vector3.new(1.4, 1, L - 1) or Vector3.new(W - 1, 1.2, L - 1)
	base.CFrame = cf
	base.Color = Color3.fromRGB(35, 35, 35)
	base.Material = Enum.Material.Metal
	base.Anchored = true
	base.RootPriority = 127
	-- Fricción casi nula: la velocidad la controla el script de manejo
	base.CustomPhysicalProperties = PhysicalProperties.new(1, 0, 0, 100, 1)
	base.Parent = model
	model.PrimaryPart = base

	local accent = spec.Accent or Color3.fromRGB(230, 230, 230)
	local bodyTop = 0.6 + H
	local body = addPart(model, base, "Carroceria", Vector3.new(W, H, L), CFrame.new(0, 0.6 + H / 2, 0), spec.Color, Enum.Material.SmoothPlastic, true)

	-- Llantas
	local wd = st.Wheel
	local wheelZ = st.Moto and (L / 2 - 0.8) or (L / 2 - 2.8)
	local xs = st.Moto and { 0 } or { -(W / 2 - 0.4), W / 2 - 0.4 }
	local zs = { -wheelZ, wheelZ }
	if spec.Style == "Bus" then
		zs = { -wheelZ, -wheelZ + 4, wheelZ }
	end
	for _, x in ipairs(xs) do
		for _, z in ipairs(zs) do
			local wheel = addPart(model, base, "Llanta", Vector3.new(st.Moto and 0.6 or 1.2, wd, wd), CFrame.new(x, wd / 2 - 0.6, z), Color3.fromRGB(20, 20, 20), Enum.Material.Rubber)
			wheel.Shape = Enum.PartType.Cylinder
		end
	end

	-- Luces
	local lx = st.Moto and { 0 } or { -(W / 2 - 1.2), W / 2 - 1.2 }
	for _, x in ipairs(lx) do
		addPart(model, base, "Faro", Vector3.new(1.4, 0.8, 0.3), CFrame.new(x, 0.6 + H * 0.7, -L / 2 - 0.05), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
		addPart(model, base, "Calavera", Vector3.new(1.4, 0.8, 0.3), CFrame.new(x, 0.6 + H * 0.7, L / 2 + 0.05), Color3.fromRGB(200, 20, 20), Enum.Material.Neon)
	end

	local driverSeat, seatSpots
	if st.Moto then
		addPart(model, base, "Manubrio", Vector3.new(2.4, 0.3, 0.3), CFrame.new(0, bodyTop + 1.2, -L / 2 + 1), Color3.fromRGB(30, 30, 30), Enum.Material.Metal)
		driverSeat = CFrame.new(0, bodyTop + 0.2, 0.4)
		seatSpots = {}
	else
		local r = st.Roof
		local roofY = bodyTop + r.H
		addPart(model, base, "Techo", Vector3.new(W - 0.4, 0.4, r.L), CFrame.new(0, roofY + 0.2, r.Z), accent, Enum.Material.SmoothPlastic, true)
		local front, back = r.Z - r.L / 2 + 0.3, r.Z + r.L / 2 - 0.3
		for _, x in ipairs({ -(W / 2 - 0.4), W / 2 - 0.4 }) do
			for _, z in ipairs({ front, back }) do
				addPart(model, base, "Pilar", Vector3.new(0.4, r.H, 0.4), CFrame.new(x, bodyTop + r.H / 2, z), accent)
			end
		end
		local glass = addPart(model, base, "Parabrisas", Vector3.new(W - 1.2, r.H * 0.85, 0.2), CFrame.new(0, bodyTop + r.H / 2, front), Color3.fromRGB(150, 200, 230), Enum.Material.Glass)
		glass.Transparency = 0.6
		if st.Bed then
			addPart(model, base, "BateaIzq", Vector3.new(0.4, 1.4, L / 2 - 1), CFrame.new(-(W / 2 - 0.2), bodyTop + 0.7, L / 4 + 0.5), spec.Color, Enum.Material.SmoothPlastic, true)
			addPart(model, base, "BateaDer", Vector3.new(0.4, 1.4, L / 2 - 1), CFrame.new(W / 2 - 0.2, bodyTop + 0.7, L / 4 + 0.5), spec.Color, Enum.Material.SmoothPlastic, true)
			addPart(model, base, "BateaAtras", Vector3.new(W, 1.4, 0.4), CFrame.new(0, bodyTop + 0.7, L / 2 - 0.2), spec.Color, Enum.Material.SmoothPlastic, true)
		end
		if spec.Sign then
			local sign = addPart(model, base, "Letrero", Vector3.new(3, 1, 1.4), CFrame.new(0, roofY + 0.9, r.Z), Color3.fromRGB(255, 255, 255), Enum.Material.Neon)
			sideText(sign, spec.Sign, Color3.fromRGB(200, 30, 120))
		end
		if spec.Siren then
			local a = addPart(model, base, "TorretaA", Vector3.new(2.4, 0.6, 1.2), CFrame.new(-1.3, roofY + 0.7, r.Z - 0.6), spec.Siren[1], Enum.Material.Neon)
			local b = addPart(model, base, "TorretaB", Vector3.new(2.4, 0.6, 1.2), CFrame.new(1.3, roofY + 0.7, r.Z - 0.6), spec.Siren[2], Enum.Material.Neon)
			a:SetAttribute("Siren", true)
			b:SetAttribute("Siren", true)
		end
		local dz = front + 2.2
		driverSeat = CFrame.new(-(W / 2 - 2.4), bodyTop + 0.4, dz)
		seatSpots = {}
		if spec.Style == "Bus" then
			for z = dz + 4, back - 1, 3.4 do
				table.insert(seatSpots, CFrame.new(-(W / 2 - 2), bodyTop + 0.4, z))
				table.insert(seatSpots, CFrame.new(W / 2 - 2, bodyTop + 0.4, z))
			end
		else
			seatSpots = { CFrame.new(W / 2 - 2.4, bodyTop + 0.4, dz), CFrame.new(-(W / 2 - 2.4), bodyTop + 0.4, dz + 3.8), CFrame.new(W / 2 - 2.4, bodyTop + 0.4, dz + 3.8) }
		end
	end
	if spec.SideText then
		sideText(body, spec.SideText, accent)
	end

	local seat = addSeat(model, base, "VehicleSeat", "Conductor", driverSeat)
	seat.HeadsUpDisplay = false
	seat.MaxSpeed = spec.MaxSpeed
	seat:SetAttribute("CDMXCar", true)
	seat:SetAttribute("CarMaxSpeed", spec.MaxSpeed)
	if anchoredDisplay then
		seat.Disabled = true
	end

	local passengerSeats = {}
	for i = 1, math.min((spec.Seats or 1) - 1, #seatSpots) do
		local ps = addSeat(model, base, "Seat", "Pasajero" .. i, seatSpots[i])
		if anchoredDisplay then
			ps.Disabled = true
		end
		table.insert(passengerSeats, ps)
	end

	if owner then
		model:SetAttribute("Owner", owner.UserId)
	end
	model.Parent = anchoredDisplay and workspace or carsFolder
	return model, base, seat, passengerSeats
end

-- Control de asientos -----------------------------------------------------------
local function setupDriverSeat(base, seat, owner)
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		local hum = seat.Occupant
		if hum then
			local player = Players:GetPlayerFromCharacter(hum.Parent)
			if player ~= owner then
				task.defer(function()
					local w = seat:FindFirstChild("SeatWeld")
					if w then
						w:Destroy()
					end
				end)
				if player then
					ctx.Notify(player, "Este vehículo es de " .. owner.DisplayName .. ".", "info")
				end
				return
			end
			base.Anchored = false
			pcall(function()
				base:SetNetworkOwner(player)
			end)
		else
			base.AssemblyLinearVelocity = Vector3.zero
			base.AssemblyAngularVelocity = Vector3.zero
			base.Anchored = true
		end
	end)
end

-- Cobro de taxi por distancia recorrida
local function setupTaxiFares(base, seats, owner)
	for _, s in ipairs(seats) do
		local rider, startPos
		s:GetPropertyChangedSignal("Occupant"):Connect(function()
			local hum = s.Occupant
			if hum then
				rider = Players:GetPlayerFromCharacter(hum.Parent)
				startPos = base.Position
				if rider and rider ~= owner then
					ctx.Notify(rider, "Subiste al taxi de " .. owner.DisplayName .. ". Tarifa mínima $" .. Config.TAXI_MIN_FARE, "info")
				end
			elseif rider then
				local passenger = rider
				rider = nil
				if passenger == owner or not passenger.Parent or not owner.Parent then
					return
				end
				local dist = (base.Position - startPos).Magnitude
				if dist < 30 then
					return
				end
				local fare = math.max(Config.TAXI_MIN_FARE, math.floor(dist / 100 * Config.TAXI_FARE_PER_100_STUDS))
				local paid = ctx.Economy.Transfer(passenger, owner, fare)
				ctx.Notify(passenger, "Pagaste $" .. paid .. " de taxi. ¡Gracias por viajar!", "info")
				ctx.Notify(owner, "Tu pasajero pagó $" .. paid .. ".", "money")
			end
		end)
	end
end

-- Saca un vehículo para el jugador en `cf` (reemplaza el anterior)
local function spawnFor(player, spec, cf, kind)
	if owned[player] then
		owned[player]:Destroy()
	end
	local model, base, seat, seats = Vehicles.Build(spec, cf, player)
	model:SetAttribute("Kind", kind)
	owned[player] = model
	setupDriverSeat(base, seat, player)
	if kind == "Taxi" or kind == "Micro" then
		setupTaxiFares(base, seats, player)
	end
	return model
end

function Vehicles.GetActive(player)
	local m = owned[player]
	return (m and m.Parent) and m or nil
end

-- ¿El jugador va manejando su vehículo?
function Vehicles.IsDriving(player, kind)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local seat = hum and hum.SeatPart
	if not (seat and seat:IsA("VehicleSeat") and seat:GetAttribute("CDMXCar")) then
		return false
	end
	if kind then
		local model = seat:FindFirstAncestorOfClass("Model")
		return model ~= nil and model:GetAttribute("Kind") == kind
	end
	return true
end

-- Garajes de trabajo y renta ---------------------------------------------------
local function onGarage(player, garage)
	local spec = Cars.JobVehicles[garage.Kind]
	if not spec or player:GetAttribute("JailedUntil") then
		return
	end
	if spec.Job and player:GetAttribute("Job") ~= spec.Job then
		local job = Config.GetJob(spec.Job)
		ctx.Notify(player, "Necesitas el trabajo de " .. job.Name .. " para usar este vehículo.", "bad")
		return
	end
	if spec.Price and spec.Price > 0 and not ctx.Economy.Charge(player, spec.Price) then
		ctx.Notify(player, "La renta cuesta $" .. spec.Price .. ".", "bad")
		return
	end
	spawnFor(player, spec, garage.SpawnCFrame, garage.Kind)
	ctx.Notify(player, "Tu " .. spec.Name .. " está listo. Súbete al asiento del conductor (W/A/S/D).", "good")
end

-- Agencia de autos -------------------------------------------------------------
local function nearestParking(player)
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	local best, bestD = ctx.Map.ParkingSpots[1], math.huge
	if root then
		for _, cf in ipairs(ctx.Map.ParkingSpots) do
			local d = (cf.Position - root.Position).Magnitude
			if d < bestD then
				best, bestD = cf, d
			end
		end
	end
	return best
end

local function ownedSpec(entry)
	local car = Cars.Get(entry.Id)
	if not car then
		return nil
	end
	local paintName = Cars.PaintOrder[entry.Paint] or "Blanco"
	return {
		Name = car.Name, Style = car.Style, MaxSpeed = car.MaxSpeed, Seats = car.Seats,
		Color = Cars.Paint[paintName], Accent = Cars.Paint[paintName]:Lerp(Color3.new(1, 1, 1), 0.15),
	}
end

local function onBuyCar(player, carId, paintIndex)
	if type(carId) ~= "string" or type(paintIndex) ~= "number" then
		return
	end
	local car = Cars.Get(carId)
	paintIndex = math.clamp(math.floor(paintIndex), 1, #Cars.PaintOrder)
	if not car then
		return
	end
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if not root or (root.Position - ctx.Map.Dealership.Position).Magnitude > 40 then
		ctx.Notify(player, "Acércate al mostrador de la agencia.", "info")
		return
	end
	local data = ctx.Economy.GetData(player)
	if #data.Cars >= 10 then
		ctx.Notify(player, "Tu garage está lleno (máximo 10 autos).", "bad")
		return
	end
	if not ctx.Economy.Charge(player, car.Price) then
		ctx.Notify(player, "No te alcanza. El " .. car.Name .. " cuesta $" .. car.Price .. ".", "bad")
		return
	end
	table.insert(data.Cars, { Id = car.Id, Paint = paintIndex })
	ctx.Remotes.GarageUpdate:FireClient(player, data.Cars)
	local entry = data.Cars[#data.Cars]
	spawnFor(player, ownedSpec(entry), ctx.Map.DealershipSpawn, "Propio")
	ctx.Notify(player, "¡Felicidades por tu " .. car.Name .. "! Te espera afuera de la agencia.", "money")
end

local function onSpawnOwned(player, index)
	if type(index) ~= "number" then
		return
	end
	local data = ctx.Economy.GetData(player)
	local entry = data.Cars[math.floor(index)]
	if not entry or player:GetAttribute("JailedUntil") then
		return
	end
	local spec = ownedSpec(entry)
	if not spec then
		return
	end
	spawnFor(player, spec, nearestParking(player), "Propio")
	ctx.Notify(player, "Tu " .. spec.Name .. " te espera en el estacionamiento más cercano (mira el GPS).", "good")
	ctx.Remotes.Waypoint:FireClient(player, nearestParking(player).Position, "Tu auto")
end

function Vehicles.Init(context)
	ctx = context
	carsFolder = Instance.new("Folder")
	carsFolder.Name = "Vehiculos"
	carsFolder.Parent = workspace
	for _, garage in ipairs(ctx.Map.Garages) do
		garage.Prompt.Triggered:Connect(function(player)
			onGarage(player, garage)
		end)
	end
	ctx.Map.DealershipPrompt.Triggered:Connect(function(player)
		ctx.Remotes.OpenDealership:FireClient(player, ctx.Economy.GetData(player).Cars)
	end)
	-- Autos de exhibición
	local showroom = { { "Tsuro", 4 }, { "Jeta", 3 }, { "Lobo", 5 }, { "Uracan", 9 } }
	for i, entry in ipairs(showroom) do
		local cf = ctx.Map.ShowroomSpots[i]
		if cf then
			local spec = ownedSpec({ Id = entry[1], Paint = entry[2] })
			local model = Vehicles.Build(spec, cf, nil, true)
			model.Parent = ctx.Map.Root
		end
	end
	ctx.Remotes.BuyCar.OnServerEvent:Connect(onBuyCar)
	ctx.Remotes.SpawnOwnedCar.OnServerEvent:Connect(onSpawnOwned)
	Players.PlayerAdded:Connect(function(player)
		local data = ctx.Economy.WaitForData(player)
		if data and player.Parent then
			ctx.Remotes.GarageUpdate:FireClient(player, data.Cars)
		end
	end)
	Players.PlayerRemoving:Connect(function(player)
		if owned[player] then
			owned[player]:Destroy()
			owned[player] = nil
		end
	end)
	-- Torretas parpadeantes
	task.spawn(function()
		local on = false
		while true do
			task.wait(0.35)
			on = not on
			for _, model in ipairs(carsFolder:GetChildren()) do
				for _, p in ipairs(model:GetChildren()) do
					if p:GetAttribute("Siren") then
						p.Transparency = ((p.Name == "TorretaA") == on) and 0 or 0.7
					end
				end
			end
		end
	end)
end

return Vehicles
