-- Gameplay: teléfono, diálogos, rastreador de misiones con GPS, agencia de autos
-- y armerías. Usa los paneles de UI.luau.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local ProximityPromptService = game:GetService("ProximityPromptService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Cars = require(Shared:WaitForChild("Cars"))
local Weapons = require(Shared:WaitForChild("Weapons"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local player = Players.LocalPlayer

local Gameplay = {}
local UI -- se asigna en Init
local new

local garage = {} -- autos del jugador
local objectives = {} -- [slot] = info
local markers = {} -- [slot] = { Part, Label }
local storyInfo

local SLOT_COLORS = {
	Story = Color3.fromRGB(240, 200, 60),
	Job = Color3.fromRGB(240, 120, 20),
	Extra = Color3.fromRGB(120, 200, 255),
}

-- Rastreador de misiones -------------------------------------------------------
local tracker, trackerRows = nil, {}

local function buildTracker()
	tracker = new("Frame", {
		Name = "Misiones",
		AnchorPoint = Vector2.new(0, 0.5),
		Position = UDim2.new(0, 12, 0.42, 0),
		Size = UDim2.fromOffset(280, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundTransparency = 1,
		Parent = UI.Gui,
	}, { new("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }) })
	for i, slot in ipairs({ "Story", "Job" }) do
		local row = new("Frame", {
			LayoutOrder = i,
			Size = UDim2.new(1, 0, 0, 0),
			AutomaticSize = Enum.AutomaticSize.Y,
			BackgroundColor3 = UI.Theme.Bg,
			BackgroundTransparency = 0.15,
			Visible = false,
			Parent = tracker,
		}, { UI.Corner(8), UI.Padding(8), new("UIListLayout", { Padding = UDim.new(0, 2) }) })
		new("Frame", { Size = UDim2.new(0, 4, 1, 16), Position = UDim2.fromOffset(-8, -8), BackgroundColor3 = SLOT_COLORS[slot], BorderSizePixel = 0, Parent = row })
		local title = new("TextLabel", {
			Size = UDim2.new(1, 0, 0, 16), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, TextSize = 13,
			TextColor3 = SLOT_COLORS[slot], TextXAlignment = Enum.TextXAlignment.Left, Text = "", Parent = row,
		})
		local label = new("TextLabel", {
			Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1,
			Font = Enum.Font.GothamMedium, TextSize = 15, TextWrapped = true, TextColor3 = UI.Theme.Text,
			TextXAlignment = Enum.TextXAlignment.Left, Text = "", Parent = row,
		})
		local dist = new("TextLabel", {
			Size = UDim2.new(1, 0, 0, 14), BackgroundTransparency = 1, Font = Enum.Font.Gotham, TextSize = 12,
			TextColor3 = UI.Theme.Muted, TextXAlignment = Enum.TextXAlignment.Left, Text = "", Parent = row,
		})
		trackerRows[slot] = { Frame = row, Title = title, Label = label, Dist = dist }
	end
end

local function clearMarker(slot)
	local m = markers[slot]
	if m then
		m.Part:Destroy()
		markers[slot] = nil
	end
end

local function setMarker(slot, pos, text)
	clearMarker(slot)
	if not pos then
		return
	end
	local p = Instance.new("Part")
	p.Name = "Marcador_" .. slot
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	p.Material = Enum.Material.Neon
	p.Color = SLOT_COLORS[slot]
	p.Transparency = 0.65
	p.Size = Vector3.new(1.5, 300, 1.5)
	p.CFrame = CFrame.new(pos.X, 150, pos.Z)
	local att = Instance.new("Attachment")
	att.Position = Vector3.new(0, -140, 0)
	att.Parent = p
	local bb = new("BillboardGui", {
		Size = UDim2.fromOffset(180, 44), AlwaysOnTop = true, LightInfluence = 0, Adornee = p,
		StudsOffsetWorldSpace = Vector3.new(0, -142, 0),
	})
	local l = new("TextLabel", {
		Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack, TextScaled = true,
		TextColor3 = SLOT_COLORS[slot], TextStrokeTransparency = 0.2, Text = "▼ " .. (text or ""), Parent = bb,
	})
	bb.Parent = p
	p.Parent = workspace
	markers[slot] = { Part = p, Label = l, Text = text }
end

local function showObjective(slot, info)
	objectives[slot] = info
	if slot == "Story" then
		storyInfo = info
	end
	local row = trackerRows[slot]
	if row then
		row.Frame.Visible = info ~= nil
		if info then
			row.Title.Text = info.ChapterTitle or ""
			row.Label.Text = info.Label or ""
		end
	end
	setMarker(slot, info and info.Target, info and (slot == "Story" and "Historia" or "Trabajo"))
end

local function updateDistances()
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not root then
		return
	end
	for slot, m in pairs(markers) do
		local d = Vector2.new(m.Part.Position.X - root.Position.X, m.Part.Position.Z - root.Position.Z).Magnitude
		local text = math.floor(d) .. " m"
		m.Label.Text = "▼ " .. (m.Text or "") .. " · " .. text
		local row = trackerRows[slot]
		if row then
			row.Dist.Text = "A " .. text
		end
	end
end

-- Diálogos -------------------------------------------------------------------
local dialogFrame, dialogName, dialogText, dialogNext, dialogOptions
local dialogQueue, dialogIndex, dialogData

local function buildDialog()
	dialogFrame = new("Frame", {
		Name = "Dialogo",
		AnchorPoint = Vector2.new(0.5, 1),
		Position = UDim2.new(0.5, 0, 1, -70),
		Size = UDim2.new(0.92, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = UI.Theme.Bg,
		BackgroundTransparency = 0.05,
		Visible = false,
		ZIndex = 20,
		Parent = UI.Gui,
	}, { UI.Corner(12), UI.Padding(14), new("UISizeConstraint", { MaxSize = Vector2.new(640, 400) }),
		new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }) })
	dialogName = new("TextLabel", {
		LayoutOrder = 1, Size = UDim2.new(1, 0, 0, 22), BackgroundTransparency = 1, Font = Enum.Font.GothamBlack,
		TextSize = 18, TextColor3 = UI.Theme.Gold, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = dialogFrame,
	})
	dialogText = new("TextLabel", {
		LayoutOrder = 2, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1,
		Font = Enum.Font.GothamMedium, TextSize = 17, TextWrapped = true, TextColor3 = UI.Theme.Text,
		TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, Parent = dialogFrame,
	})
	dialogOptions = new("Frame", {
		LayoutOrder = 3, Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1,
		ZIndex = 21, Parent = dialogFrame,
	}, { new("UIListLayout", { Padding = UDim.new(0, 6) }) })
	dialogNext = UI.Button("Siguiente ▶  [E]", UI.Theme.Pink, UDim2.fromOffset(170, 36))
	dialogNext.LayoutOrder = 4
	dialogNext.ZIndex = 21
	dialogNext.Parent = dialogFrame
end

local function closeDialog(choice)
	dialogFrame.Visible = false
	dialogData = nil
	ProximityPromptService.Enabled = true
	Remotes.DialogDone:FireServer(choice or 0)
end

local function showLine()
	for _, c in ipairs(dialogOptions:GetChildren()) do
		if c:IsA("TextButton") then
			c:Destroy()
		end
	end
	dialogText.Text = dialogQueue[dialogIndex]
	local last = dialogIndex >= #dialogQueue
	if last and dialogData.Options then
		dialogNext.Visible = false
		for i, text in ipairs(dialogData.Options) do
			local b = UI.Button(text, i == 1 and UI.Theme.Green or UI.Theme.Red, UDim2.new(1, 0, 0, 42))
			b.TextWrapped = true
			b.ZIndex = 22
			b.Parent = dialogOptions
			b.MouseButton1Click:Connect(function()
				closeDialog(i)
			end)
		end
	else
		dialogNext.Visible = true
		dialogNext.Text = last and "Cerrar  [E]" or "Siguiente ▶  [E]"
	end
end

local function nextLine()
	if not dialogData then
		return
	end
	if dialogIndex >= #dialogQueue then
		if not dialogData.Options then
			closeDialog(0)
		end
		return
	end
	dialogIndex = dialogIndex + 1
	showLine()
end

local function openDialog(data)
	UI.ClosePanel()
	dialogData = data
	dialogQueue = data.Lines
	dialogIndex = 1
	dialogName.Text = data.Name
	dialogFrame.Visible = true
	-- Mientras habla, la tecla E avanza el diálogo en vez de activar avisos
	ProximityPromptService.Enabled = false
	showLine()
end

-- Agencia de autos -------------------------------------------------------------
local function paintSwatch(name)
	return Cars.Paint[name]
end

local function openPaints(car)
	UI.OpenPanel(car.Name .. " · elige color")
	for i, paintName in ipairs(Cars.PaintOrder) do
		UI.AddRow(i, paintName, "Precio: " .. UI.FormatMoney(car.Price), paintSwatch(paintName), "Comprar", UI.Theme.Green, function()
			Remotes.BuyCar:FireServer(car.Id, i)
			UI.ClosePanel()
		end)
	end
end

local STYLE_NAMES = { Sedan = "Sedán", Hatch = "Compacto", Pickup = "Pickup", SUV = "Camioneta", Sport = "Deportivo", Moto = "Moto", Van = "Van", Bus = "Micro" }

local function openDealership(cars)
	garage = cars or garage
	UI.OpenPanel("Agencia Reforma · Autos")
	for i, car in ipairs(Cars.List) do
		local sub = STYLE_NAMES[car.Style] .. " · " .. car.MaxSpeed .. " km/h · " .. car.Seats .. " plazas. " .. car.Desc
		UI.AddRow(i, car.Name, sub, UI.Theme.Gold, UI.FormatMoney(car.Price), UI.Theme.Green, function()
			openPaints(car)
		end)
	end
end

-- Armerías ---------------------------------------------------------------------
local function openWeaponShop(index, shopId)
	local shop = Weapons.Shops[shopId]
	if not shop then
		return
	end
	UI.OpenPanel(shop.Name)
	for i, item in ipairs(shop.Items) do
		local def = Weapons.Get(item.Id)
		local sub
		if def.Type == "Gun" then
			sub = "Daño " .. def.Damage .. (def.Pellets and (" × " .. def.Pellets) or "") .. " · cargador " .. def.Mag .. (def.Auto and " · automática" or "")
		elseif def.Type == "Taser" then
			sub = "Paraliza " .. def.Stun .. " s a sospechosos buscados"
		else
			sub = "Cuerpo a cuerpo · daño " .. def.Damage
		end
		UI.AddRow(i, def.Name, sub, def.Color, item.Price > 0 and UI.FormatMoney(item.Price) or "Gratis", UI.Theme.Green, function()
			Remotes.BuyWeapon:FireServer(index, item.Id)
		end)
	end
end

-- Teléfono ---------------------------------------------------------------------
local function openPhone()
	UI.OpenPanel("Teléfono")
	local order = 1
	if storyInfo then
		local sub = storyInfo.Label or ""
		if storyInfo.Path then
			sub = sub .. " · Camino " .. (storyInfo.Path == "Honrado" and "honrado" or "chueco")
		end
		UI.AddRow(order, "Historia · " .. math.min(storyInfo.Chapter or 1, storyInfo.Total or 5) .. "/" .. (storyInfo.Total or 5) .. "  " .. (storyInfo.ChapterTitle or ""), sub,
			UI.Theme.Gold, "GPS", UI.Theme.Orange, function()
				if storyInfo.Target then
					setMarker("Story", storyInfo.Target, "Historia")
				end
				UI.ClosePanel()
			end)
		order = order + 1
	end
	if #garage == 0 then
		UI.AddRow(order, "Mis autos", "Todavía no tienes autos. Compra uno en la Agencia Reforma.", UI.Theme.Pink, "Ruta", UI.Theme.Pink, function()
			setMarker("Extra", Vector3.new(-560, 0, -264), "Agencia Reforma")
			UI.ClosePanel()
		end)
	else
		for i, entry in ipairs(garage) do
			local car = Cars.Get(entry.Id)
			if car then
				local paintName = Cars.PaintOrder[entry.Paint] or "Blanco"
				UI.AddRow(order, car.Name, "Color " .. paintName .. " · " .. car.MaxSpeed .. " km/h", Cars.Paint[paintName], "Pedir", UI.Theme.Green, function()
					Remotes.SpawnOwnedCar:FireServer(i)
					UI.ClosePanel()
				end)
				order = order + 1
			end
		end
	end
	UI.AddRow(order + 1, "Ayuda", "[J] trabajos · [P] teléfono · [E] interactuar · clic dispara · [R] recarga", UI.Theme.Muted, "OK", UI.Theme.Row, function()
		UI.ClosePanel()
	end)
end

function Gameplay.Init(uiModule)
	UI = uiModule
	new = UI.New
	buildTracker()
	buildDialog()

	local phoneBtn = UI.Button("TELÉFONO [P]", UI.Theme.Orange, UDim2.fromOffset(150, 44))
	phoneBtn.AnchorPoint = Vector2.new(0, 1)
	phoneBtn.Position = UDim2.new(0, 170, 1, -12)
	phoneBtn.Parent = UI.Gui
	phoneBtn.MouseButton1Click:Connect(function()
		if UI.IsPanelOpen() then
			UI.ClosePanel()
		else
			openPhone()
		end
	end)
	dialogNext.MouseButton1Click:Connect(nextLine)

	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.P then
			if UI.IsPanelOpen() then
				UI.ClosePanel()
			else
				openPhone()
			end
		elseif input.KeyCode == Enum.KeyCode.E and dialogData then
			nextLine()
		end
	end)

	Remotes.Objective.OnClientEvent:Connect(showObjective)
	Remotes.Dialog.OnClientEvent:Connect(openDialog)
	Remotes.GarageUpdate.OnClientEvent:Connect(function(cars)
		garage = cars or {}
	end)
	Remotes.OpenDealership.OnClientEvent:Connect(openDealership)
	Remotes.OpenWeaponShop.OnClientEvent:Connect(openWeaponShop)
	Remotes.Waypoint.OnClientEvent:Connect(function(pos, text)
		setMarker("Extra", pos, text)
		task.delay(60, function()
			if markers.Extra and markers.Extra.Text == text then
				clearMarker("Extra")
			end
		end)
	end)

	local acc = 0
	RunService.Heartbeat:Connect(function(dt)
		acc = acc + dt
		if acc >= 0.3 then
			acc = 0
			updateDistances()
			-- El marcador "Extra" desaparece al llegar
			local m = markers.Extra
			local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
			if m and root and Vector2.new(m.Part.Position.X - root.Position.X, m.Part.Position.Z - root.Position.Z).Magnitude < 15 then
				clearMarker("Extra")
			end
		end
	end)

	-- Pedimos al servidor el estado actual (misiones, autos)
	Remotes.Sync:FireServer()
end

return Gameplay
