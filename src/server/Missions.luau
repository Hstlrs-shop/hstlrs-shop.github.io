-- Missions: la historia "Llegada a la ciudad", personajes con diálogo, enemigos
-- con IA y misiones repetibles de Repartidor y Microbusero.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Story = require(ReplicatedStorage.Shared.Story)
local Weapons = require(ReplicatedStorage.Shared.Weapons)

local Missions = {}

local ctx
local npcFolder, enemyFolder
local state = {} -- [player] = { Dialog = step, Group = { Name, Models }, Side = {...} }
local enemies = {} -- [model] = { Owner, Def, Weapon, LastShot, Home }

local IDLE_LINES = {
	Lupe = { "¿Unos taquitos, mijo? El pastor está recién salido del trompo.", "Con hambre nadie trabaja bien." },
	Profe = { "Lleve sus chicles, sus chicles de a cinco...", "En el Metro se aprende más que en la escuela, joven." },
	Chino = { "¿Qué onda, carnal? Aquí andamos.", "Coyoacán es otro rollo, ¿no?" },
	Ramirez = { "Circule, ciudadano.", "Si ve algo raro, repórtelo." },
	Tuerto = { "Yo no vi nada, yo no sé nada.", "Vuelve cuando traigas lana." },
}

local function st(player)
	local s = state[player]
	if not s then
		s = {}
		state[player] = s
	end
	return s
end

local function rootOf(player)
	local char = player.Character
	return char and char:FindFirstChild("HumanoidRootPart")
end

local function flatDist(a, b)
	return Vector2.new(a.X - b.X, a.Z - b.Z).Magnitude
end

-- Personajes -----------------------------------------------------------------
local function makeRig(name, skin, shirt, pants, health)
	local model
	local ok = pcall(function()
		local desc = Instance.new("HumanoidDescription")
		desc.HeadColor = skin
		desc.LeftArmColor = skin
		desc.RightArmColor = skin
		desc.TorsoColor = shirt
		desc.LeftLegColor = pants
		desc.RightLegColor = pants
		model = Players:CreateHumanoidModelFromDescription(desc, Enum.HumanoidRigType.R15)
	end)
	if not ok or not model then
		-- Respaldo sencillo si no se pudo crear el rig
		model = Instance.new("Model")
		local rootPart = Instance.new("Part")
		rootPart.Name = "HumanoidRootPart"
		rootPart.Size = Vector3.new(2, 2, 1)
		rootPart.Color = shirt
		rootPart.Parent = model
		local head = Instance.new("Part")
		head.Name = "Head"
		head.Size = Vector3.new(1.2, 1.2, 1.2)
		head.Color = skin
		head.CFrame = rootPart.CFrame * CFrame.new(0, 1.6, 0)
		local w = Instance.new("WeldConstraint")
		w.Part0 = rootPart
		w.Part1 = head
		w.Parent = head
		head.Parent = model
		local hum = Instance.new("Humanoid")
		hum.RigType = Enum.HumanoidRigType.R15
		hum.HipHeight = 2
		hum.Parent = model
		model.PrimaryPart = rootPart
	end
	model.Name = name
	local hum = model:FindFirstChildOfClass("Humanoid")
	hum.DisplayName = name
	hum.MaxHealth = health or 100
	hum.Health = health or 100
	hum.BreakJointsOnDeath = false
	return model
end

local function spawnNpcs()
	for id, def in pairs(Story.Npcs) do
		local model = makeRig(def.Name, def.Skin, def.Shirt, def.Pants)
		model:PivotTo(CFrame.lookAt(def.Pos + Vector3.new(0, 3, 0), def.Face + Vector3.new(0, 3, 0)))
		for _, p in ipairs(model:GetDescendants()) do
			if p:IsA("BasePart") then
				p.Anchored = true
			end
		end
		local hum = model:FindFirstChildOfClass("Humanoid")
		hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.Viewer
		hum.NameDisplayDistance = 60
		model:SetAttribute("NpcId", id)
		local pr = Instance.new("ProximityPrompt")
		pr.ActionText = "Hablar"
		pr.ObjectText = def.Name
		pr.KeyboardKeyCode = Enum.KeyCode.E
		pr.MaxActivationDistance = 10
		pr.RequiresLineOfSight = false
		pr.Parent = model:FindFirstChild("HumanoidRootPart")
		pr.Triggered:Connect(function(player)
			Missions.OnTalk(player, id)
		end)
		model.Parent = npcFolder
	end
end

-- Progreso de la historia ----------------------------------------------------
local function storyData(player)
	return ctx.Economy.GetData(player).Story
end

-- Devuelve el paso actual (saltando los de otro camino). Entrega premios al cerrar capítulos.
local function currentStep(player)
	local s = storyData(player)
	while not s.Done do
		local ch = Story.Chapters[s.Chapter]
		if not ch then
			s.Done = true
			break
		end
		local step = ch.Steps[s.Step]
		if not step then
			ctx.Economy.Add(player, ch.Reward)
			ctx.Notify(player, "✔ Capítulo " .. s.Chapter .. " completado: " .. ch.Title .. ". +$" .. ch.Reward, "money")
			s.Chapter = s.Chapter + 1
			s.Step = 1
			s.Sub = nil
			local nextCh = Story.Chapters[s.Chapter]
			if nextCh then
				ctx.Notify(player, "Capítulo " .. s.Chapter .. ": " .. nextCh.Title, "good")
			end
		elseif step.Path and step.Path ~= s.Path then
			s.Step = s.Step + 1
		else
			return step, ch
		end
	end
	return nil
end

local function groupCenter(name)
	local sum, n = Vector3.zero, 0
	for _, e in ipairs(Story.Groups[name]) do
		sum = sum + e.Pos
		n = n + 1
	end
	return sum / math.max(n, 1)
end

local function sendStoryObjective(player)
	local s = storyData(player)
	local step, ch = currentStep(player)
	local info = { Chapter = s.Chapter, Total = #Story.Chapters, Path = s.Path, Title = ctx.Economy.GetData(player).Title }
	if not step then
		info.ChapterTitle = "Historia completada"
		info.Label = "Título: " .. (info.Title or "—") .. ". ¡Gracias por jugar!"
		ctx.Remotes.Objective:FireClient(player, "Story", info)
		return
	end
	info.ChapterTitle = "Capítulo " .. s.Chapter .. " · " .. ch.Title
	if step.Type == "Talk" or step.Type == "Choice" then
		local npc = Story.Npcs[step.Npc]
		info.Label = "Habla con " .. npc.Name
		info.Target = npc.Pos
		info.NpcId = step.Npc
	elseif step.Type == "GoTo" then
		info.Label = step.Label
		info.Target = step.Pos
	elseif step.Type == "Route" then
		local p = step.Points[s.Sub or 1]
		info.Label = p.Label
		info.Target = p.Pos
	elseif step.Type == "Job" then
		info.Label = step.Label
	elseif step.Type == "Defeat" then
		local g = st(player).Group
		local left = 0
		if g and g.Name == step.Group then
			for _, m in ipairs(g.Models) do
				local h = m:FindFirstChildOfClass("Humanoid")
				if m.Parent and h and h.Health > 0 then
					left = left + 1
				end
			end
		else
			left = #Story.Groups[step.Group]
		end
		info.Label = step.Label .. " (quedan " .. left .. ")"
		info.Target = groupCenter(step.Group)
	end
	ctx.Remotes.Objective:FireClient(player, "Story", info)
end
Missions.SendStoryObjective = sendStoryObjective

local function advance(player)
	local s = storyData(player)
	s.Step = s.Step + 1
	s.Sub = nil
	st(player).Dialog = nil
	sendStoryObjective(player)
end

-- Diálogos -----------------------------------------------------------------
function Missions.OnTalk(player, npcId)
	local step = currentStep(player)
	local npc = Story.Npcs[npcId]
	if step and (step.Type == "Talk" or step.Type == "Choice") and step.Npc == npcId then
		st(player).Dialog = step
		local options
		if step.Type == "Choice" then
			options = {}
			for i, o in ipairs(step.Options) do
				options[i] = o.Text
			end
		end
		ctx.Remotes.Dialog:FireClient(player, { Name = npc.Name, Lines = step.Lines, Options = options })
	else
		local lines = IDLE_LINES[npcId] or { "..." }
		ctx.Remotes.Dialog:FireClient(player, { Name = npc.Name, Lines = { lines[math.random(1, #lines)] } })
	end
end

local function onDialogDone(player, choice)
	local s = st(player)
	local step = currentStep(player)
	if not step or s.Dialog ~= step then
		return
	end
	if step.Type == "Choice" then
		local option = type(choice) == "number" and step.Options[math.floor(choice)]
		if not option then
			return
		end
		storyData(player).Path = option.Path
		ctx.Notify(player, option.Path == "Honrado" and "Elegiste el camino honrado." or "Elegiste el camino chueco.", "info")
	end
	if step.Title then
		local data = ctx.Economy.GetData(player)
		data.Title = step.Title
		player:SetAttribute("Title", step.Title)
		ctx.Notify(player, "🏆 Nuevo título: " .. step.Title, "money")
	end
	advance(player)
end

-- Enemigos -------------------------------------------------------------------
local function despawnGroup(player)
	local s = st(player)
	if s.Group then
		for _, m in ipairs(s.Group.Models) do
			enemies[m] = nil
			if m.Parent then
				m:Destroy()
			end
		end
		s.Group = nil
	end
end

local function spawnGroup(player, name)
	despawnGroup(player)
	local models = {}
	for _, e in ipairs(Story.Groups[name]) do
		local isBoss = e.Boss
		local model = makeRig(e.Name or "Tlacuache", Color3.fromRGB(150 + math.random(0, 40), 105 + math.random(0, 30), 70),
			isBoss and Color3.fromRGB(240, 240, 235) or Color3.fromRGB(60, 20, 25), isBoss and Color3.fromRGB(240, 240, 235) or Color3.fromRGB(25, 25, 30), e.Health or 100)
		model:PivotTo(CFrame.new(e.Pos + Vector3.new(0, 3.5, 0)))
		model:SetAttribute("Enemy", true)
		local def = Weapons.Get(e.Weapon) or Weapons.Get("Pistola")
		-- Arma visible en la mano
		local hand = model:FindFirstChild("RightHand") or model:FindFirstChild("HumanoidRootPart")
		local gun = Instance.new("Part")
		gun.Name = "Arma"
		gun.Size = def.Size
		gun.Color = def.Color
		gun.CanCollide = false
		gun.Massless = true
		gun.CFrame = hand.CFrame * CFrame.new(0, -0.4, -def.Size.Z / 2)
		local w = Instance.new("WeldConstraint")
		w.Part0 = hand
		w.Part1 = gun
		w.Parent = gun
		gun.Parent = model
		local hum = model:FindFirstChildOfClass("Humanoid")
		hum.WalkSpeed = 12
		hum.Died:Connect(function()
			enemies[model] = nil
			Debris:AddItem(model, 3)
			if player.Parent then
				if isBoss then
					ctx.Notify(player, "¡Venciste a " .. model.Name .. "!", "money")
				end
				sendStoryObjective(player)
			end
		end)
		model.Parent = enemyFolder
		enemies[model] = { Owner = player, Def = def, LastShot = os.clock() + math.random() * 1.5, Home = e.Pos, Boss = isBoss }
		table.insert(models, model)
	end
	st(player).Group = { Name = name, Models = models }
	ctx.Notify(player, "⚠ ¡Te descubrieron! Cúbrete y pelea.", "alert")
	sendStoryObjective(player)
end

function Missions.GetEnemies()
	local list = {}
	for m in pairs(enemies) do
		if m.Parent then
			table.insert(list, m)
		end
	end
	return list
end

local function enemyThink(model, e)
	local hum = model:FindFirstChildOfClass("Humanoid")
	local root = model:FindFirstChild("HumanoidRootPart")
	local head = model:FindFirstChild("Head")
	if not hum or hum.Health <= 0 or not root or not head then
		return
	end
	local target = rootOf(e.Owner)
	local thum = e.Owner.Character and e.Owner.Character:FindFirstChildOfClass("Humanoid")
	if not target or not thum or thum.Health <= 0 then
		hum:MoveTo(e.Home)
		return
	end
	local dist = (target.Position - root.Position).Magnitude
	if dist > 220 then
		hum:MoveTo(e.Home)
		return
	end
	-- Línea de vista
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { model }
	local ray = workspace:Raycast(head.Position, target.Position - head.Position, params)
	local sees = ray and ray.Instance:IsDescendantOf(e.Owner.Character)
	if dist > 35 or not sees then
		hum:MoveTo(target.Position + (root.Position - target.Position).Unit * 25)
	else
		hum:MoveTo(root.Position)
		root.CFrame = CFrame.lookAt(root.Position, Vector3.new(target.Position.X, root.Position.Y, target.Position.Z))
	end
	if sees and dist < 110 then
		local now = os.clock()
		local cooldown = math.max(0.7, e.Def.Cooldown * 6)
		if now - e.LastShot >= cooldown then
			e.LastShot = now
			-- Los NPC fallan a propósito un poco y pegan menos que los jugadores
			local aim = target.Position + Vector3.new(math.random(-20, 20) / 10, math.random(-10, 15) / 10, math.random(-20, 20) / 10)
			ctx.Combat.Fire(model, nil, e.Def, head.Position, aim, e.Boss and 0.45 or 0.3)
		end
	end
end

function Missions.OnPlayerDied(player)
	if st(player).Group then
		despawnGroup(player)
		ctx.Notify(player, "Los enemigos se reagruparon. Regresa cuando estés listo.", "info")
	end
end

-- Misiones de trabajo ---------------------------------------------------------
local function taquerias()
	local list = {}
	for _, shop in ipairs(ctx.Map.Shops) do
		if shop.ShopId == "Taqueria" then
			table.insert(list, shop.Part.Position)
		end
	end
	return list
end

local function sendJobObjective(player)
	local side = st(player).Side
	if not side then
		ctx.Remotes.Objective:FireClient(player, "Job", nil)
		return
	end
	local info = { ChapterTitle = side.Title, Label = side.Label, Target = side.Target }
	ctx.Remotes.Objective:FireClient(player, "Job", info)
end

local function newDelivery(player)
	local shops = taquerias()
	local pickup = shops[math.random(1, #shops)]
	st(player).Side = { Kind = "Delivery", Phase = "Pickup", Target = pickup, Title = "Reparto",
		Label = "Recoge el pedido en la taquería" }
	sendJobObjective(player)
end

local function newBusStop(player, index)
	local stop = Story.BusRoute[index]
	st(player).Side = { Kind = "Bus", Index = index, Target = stop.Pos, Title = "Ruta 2 · Zócalo – Chapultepec",
		Label = "Siguiente parada: " .. stop.Name .. " (maneja el micro)" }
	sendJobObjective(player)
end

local function updateSide(player, root)
	local s = st(player)
	local job = player:GetAttribute("Job")
	if job == "Repartidor" then
		if not s.Side or s.Side.Kind ~= "Delivery" then
			newDelivery(player)
			return
		end
	elseif job == "Microbusero" then
		if not s.Side or s.Side.Kind ~= "Bus" then
			newBusStop(player, 1)
			return
		end
	else
		if s.Side then
			s.Side = nil
			sendJobObjective(player)
		end
		return
	end
	local side = s.Side
	if side.Kind == "Delivery" then
		if flatDist(root.Position, side.Target) < 16 then
			if side.Phase == "Pickup" then
				local addr = Story.DeliveryAddresses[math.random(1, #Story.DeliveryAddresses)]
				side.Phase = "Drop"
				side.From = side.Target
				side.Target = addr.Pos
				side.Label = "Entrega el pedido en: " .. addr.Name
				ctx.Notify(player, "Pedido listo. Llévalo a " .. addr.Name .. ".", "info")
				sendJobObjective(player)
			else
				local dist = flatDist(side.From, side.Target)
				local pay = Config.DELIVERY_PAY + math.floor(dist / 100) * Config.DELIVERY_BONUS_PER_100
				ctx.Economy.Add(player, pay)
				ctx.Notify(player, "¡Entregado! +$" .. pay .. ". Buscando el siguiente pedido...", "money")
				s.Side = { Kind = "Delivery", Phase = "Wait", Target = nil, Title = "Reparto", Label = "Esperando pedido..." }
				sendJobObjective(player)
				task.delay(3, function()
					if player.Parent and player:GetAttribute("Job") == "Repartidor" then
						newDelivery(player)
					end
				end)
			end
		end
	elseif side.Kind == "Bus" then
		if flatDist(root.Position, side.Target) < 20 then
			if not ctx.Vehicles.IsDriving(player, "Micro") then
				return
			end
			ctx.Economy.Add(player, Config.BUS_STOP_PAY)
			ctx.Notify(player, "Parada " .. Story.BusRoute[side.Index].Name .. ": ¡súbale, súbale! +$" .. Config.BUS_STOP_PAY, "money")
			newBusStop(player, side.Index % #Story.BusRoute + 1)
		end
	end
end

-- Revisión periódica ------------------------------------------------------------
local function updateStory(player, root)
	local step = currentStep(player)
	if not step then
		return
	end
	local s = storyData(player)
	if step.Type == "GoTo" then
		if flatDist(root.Position, step.Pos) < step.Radius then
			if step.Vehicle and not ctx.Vehicles.IsDriving(player) then
				return
			end
			advance(player)
		end
	elseif step.Type == "Route" then
		local i = s.Sub or 1
		local p = step.Points[i]
		if flatDist(root.Position, p.Pos) < (step.Radius or 15) then
			if i >= #step.Points then
				advance(player)
			else
				s.Sub = i + 1
				ctx.Notify(player, "¡Entregado!", "good")
				sendStoryObjective(player)
			end
		end
	elseif step.Type == "Job" then
		if player:GetAttribute("Job") == step.Job then
			advance(player)
		end
	elseif step.Type == "Defeat" then
		local g = st(player).Group
		if not g or g.Name ~= step.Group then
			if flatDist(root.Position, groupCenter(step.Group)) < 150 then
				spawnGroup(player, step.Group)
			end
		else
			local alive = 0
			for _, m in ipairs(g.Models) do
				local h = m:FindFirstChildOfClass("Humanoid")
				if m.Parent and h and h.Health > 0 then
					alive = alive + 1
				end
			end
			if alive == 0 then
				despawnGroup(player)
				ctx.Notify(player, "¡Zona despejada!", "good")
				advance(player)
			end
		end
	end
end

local function sync(player)
	ctx.Economy.WaitForData(player)
	if not player.Parent then
		return
	end
	sendStoryObjective(player)
	sendJobObjective(player)
	ctx.Remotes.GarageUpdate:FireClient(player, ctx.Economy.GetData(player).Cars)
end

function Missions.Init(context)
	ctx = context
	npcFolder = Instance.new("Folder")
	npcFolder.Name = "NPCs"
	npcFolder.Parent = ctx.Map.Root
	enemyFolder = Instance.new("Folder")
	enemyFolder.Name = "Enemigos"
	enemyFolder.Parent = workspace
	spawnNpcs()

	ctx.Remotes.DialogDone.OnServerEvent:Connect(onDialogDone)
	ctx.Remotes.Sync.OnServerEvent:Connect(function(player)
		task.spawn(sync, player)
	end)
	Players.PlayerRemoving:Connect(function(player)
		despawnGroup(player)
		state[player] = nil
	end)

	-- Lógica de misiones (2 veces por segundo)
	task.spawn(function()
		while true do
			task.wait(0.5)
			for _, player in ipairs(Players:GetPlayers()) do
				local root = rootOf(player)
				if root and player:GetAttribute("DataReady") and not player:GetAttribute("JailedUntil") then
					local ok, err = pcall(updateStory, player, root)
					if not ok then
						warn("[CDMX] Error en historia:", err)
					end
					ok, err = pcall(updateSide, player, root)
					if not ok then
						warn("[CDMX] Error en misión de trabajo:", err)
					end
				end
			end
		end
	end)

	-- IA de enemigos (4 veces por segundo)
	task.spawn(function()
		while true do
			task.wait(0.25)
			for model, e in pairs(enemies) do
				if model.Parent then
					local ok, err = pcall(enemyThink, model, e)
					if not ok then
						warn("[CDMX] Error en IA:", err)
					end
				end
			end
		end
	end)
end

return Missions
