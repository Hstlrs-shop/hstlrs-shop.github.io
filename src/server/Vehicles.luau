-- Vehicles: taxis, patrullas, ambulancias y vochos de renta.
-- El conductor maneja desde el cliente (ver client/Driving.luau); aquí se
-- construyen los autos, se controla quién maneja y se cobra el taxi.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Vehicles = {}

local ctx
local owned = {} -- [player] = Model
local carsFolder

local function weldedPart(model, base, name, size, offset, color, material, collide)
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
	local w = Instance.new("WeldConstraint")
	w.Part0 = base
	w.Part1 = p
	w.Parent = p
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

local function buildCar(kind, def, cf, owner)
	local model = Instance.new("Model")
	model.Name = def.Name .. " de " .. owner.DisplayName

	local base = Instance.new("Part")
	base.Name = "Base"
	base.Size = Vector3.new(7, 1.2, 14)
	base.CFrame = cf
	base.Color = Color3.fromRGB(35, 35, 35)
	base.Material = Enum.Material.Metal
	base.Anchored = true
	base.RootPriority = 127
	-- Fricción casi nula: la velocidad la controla el script de manejo
	base.CustomPhysicalProperties = PhysicalProperties.new(1, 0, 0, 100, 1)
	base.Parent = model
	model.PrimaryPart = base

	local body = weldedPart(model, base, "Carroceria", Vector3.new(8, 2.4, 15), CFrame.new(0, 1.8, 0), def.Color, Enum.Material.SmoothPlastic, true)
	-- Cabina abierta: techo + pilares, para que se vea quién maneja
	weldedPart(model, base, "Techo", Vector3.new(7.6, 0.4, 7.8), CFrame.new(0, 7.4, 1), def.Accent, Enum.Material.SmoothPlastic, true)
	for _, x in ipairs({ -3.6, 3.6 }) do
		for _, z in ipairs({ -2.7, 4.7 }) do
			weldedPart(model, base, "Pilar", Vector3.new(0.4, 4.2, 0.4), CFrame.new(x, 5.1, z), def.Accent)
		end
	end
	local glass = weldedPart(model, base, "Parabrisas", Vector3.new(6.8, 3.6, 0.2), CFrame.new(0, 5.1, -2.7), Color3.fromRGB(150, 200, 230), Enum.Material.Glass)
	glass.Transparency = 0.6
	weldedPart(model, base, "FaroIzq", Vector3.new(1.4, 0.8, 0.3), CFrame.new(-2.8, 2.2, -7.55), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
	weldedPart(model, base, "FaroDer", Vector3.new(1.4, 0.8, 0.3), CFrame.new(2.8, 2.2, -7.55), Color3.fromRGB(255, 250, 220), Enum.Material.Neon)
	weldedPart(model, base, "CalaveraIzq", Vector3.new(1.4, 0.8, 0.3), CFrame.new(-2.8, 2.2, 7.55), Color3.fromRGB(200, 20, 20), Enum.Material.Neon)
	weldedPart(model, base, "CalaveraDer", Vector3.new(1.4, 0.8, 0.3), CFrame.new(2.8, 2.2, 7.55), Color3.fromRGB(200, 20, 20), Enum.Material.Neon)

	for _, x in ipairs({ -3.6, 3.6 }) do
		for _, z in ipairs({ -4.6, 4.6 }) do
			local wheel = weldedPart(model, base, "Llanta", Vector3.new(1.2, 3, 3), CFrame.new(x, 0.9, z), Color3.fromRGB(20, 20, 20), Enum.Material.Rubber)
			wheel.Shape = Enum.PartType.Cylinder
		end
	end

	if kind == "Taxi" then
		local sign = weldedPart(model, base, "LetreroTaxi", Vector3.new(3, 1, 1.4), CFrame.new(0, 8.1, 1), Color3.fromRGB(255, 255, 255), Enum.Material.Neon)
		sideText(sign, "TAXI", Color3.fromRGB(200, 30, 120))
		sideText(body, "CDMX", Color3.fromRGB(255, 255, 255))
	elseif def.Siren then
		weldedPart(model, base, "TorretaRoja", Vector3.new(2.4, 0.6, 1.2), CFrame.new(-1.3, 7.9, 0.4), Color3.fromRGB(255, 30, 30), Enum.Material.Neon)
		weldedPart(model, base, "TorretaAzul", Vector3.new(2.4, 0.6, 1.2), CFrame.new(1.3, 7.9, 0.4),
			kind == "Patrulla" and Color3.fromRGB(30, 80, 255) or Color3.fromRGB(255, 255, 255), Enum.Material.Neon)
		sideText(body, kind == "Patrulla" and "POLICÍA" or "AMBULANCIA", def.Accent)
	end

	local seat = Instance.new("VehicleSeat")
	seat.Name = "Conductor"
	seat.Size = Vector3.new(2, 1, 2)
	seat.CFrame = base.CFrame * CFrame.new(-1.6, 3.4, -0.4)
	seat.Color = Color3.fromRGB(40, 40, 40)
	seat.HeadsUpDisplay = false
	seat.MaxSpeed = def.MaxSpeed
	seat.Massless = true
	seat:SetAttribute("CDMXCar", true)
	seat:SetAttribute("CarMaxSpeed", def.MaxSpeed)
	local sw = Instance.new("WeldConstraint")
	sw.Part0 = base
	sw.Part1 = seat
	sw.Parent = seat
	seat.Parent = model

	local passengerSeats = {}
	local spots = { CFrame.new(1.6, 3.4, -0.4), CFrame.new(-1.6, 3.4, 3.4), CFrame.new(1.6, 3.4, 3.4) }
	for i = 1, math.min(def.Seats or 1, #spots) do
		local ps = Instance.new("Seat")
		ps.Name = "Pasajero" .. i
		ps.Size = Vector3.new(2, 1, 2)
		ps.CFrame = base.CFrame * spots[i]
		ps.Color = Color3.fromRGB(40, 40, 40)
		ps.Massless = true
		local w = Instance.new("WeldConstraint")
		w.Part0 = base
		w.Part1 = ps
		w.Parent = ps
		ps.Parent = model
		table.insert(passengerSeats, ps)
	end

	model:SetAttribute("Owner", owner.UserId)
	model.Parent = carsFolder
	return model, base, seat, passengerSeats
end

local function setupDriverSeat(model, base, seat, owner)
	seat:GetPropertyChangedSignal("Occupant"):Connect(function()
		local hum = seat.Occupant
		if hum then
			local player = Players:GetPlayerFromCharacter(hum.Parent)
			if player ~= owner then
				task.defer(function()
					local weld = seat:FindFirstChild("SeatWeld")
					if weld then
						weld:Destroy()
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
local function setupTaxiFares(model, base, seats, owner)
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

local function onGarage(player, garage)
	local def = Config.Vehicles[garage.Kind]
	if not def then
		return
	end
	if player:GetAttribute("JailedUntil") then
		return
	end
	if def.Job and player:GetAttribute("Job") ~= def.Job then
		local job = Config.GetJob(def.Job)
		ctx.Notify(player, "Necesitas el trabajo de " .. job.Name .. " para usar este vehículo.", "bad")
		return
	end
	if def.Price > 0 and not ctx.Economy.Charge(player, def.Price) then
		ctx.Notify(player, "La renta cuesta $" .. def.Price .. ".", "bad")
		return
	end
	if owned[player] then
		owned[player]:Destroy()
	end
	local model, base, seat, seats = buildCar(garage.Kind, def, garage.SpawnCFrame, player)
	owned[player] = model
	setupDriverSeat(model, base, seat, player)
	if garage.Kind == "Taxi" then
		setupTaxiFares(model, base, seats, player)
	end
	ctx.Notify(player, "Tu " .. def.Name .. " está listo. Súbete al asiento del conductor (W/A/S/D).", "good")
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
	Players.PlayerRemoving:Connect(function(player)
		if owned[player] then
			owned[player]:Destroy()
			owned[player] = nil
		end
	end)
end

return Vehicles
