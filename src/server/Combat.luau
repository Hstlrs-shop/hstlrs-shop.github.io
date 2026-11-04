-- Combat: armas, disparos validados en el servidor, daño, taser, zonas seguras,
-- reglas de rol y hospital al caer. Estilo realista sin sangre.
--
-- Reglas:
--  * En las zonas seguras (Zócalo, Hospital, Reclusorio) nadie recibe daño.
--  * Los policías solo pueden lastimar a jugadores buscados. Entre policías no hay daño.
--  * Cualquier otro jugador que ataque a alguien queda "SE BUSCA".
--  * Si un policía abate a un buscado, el buscado despierta en el Reclusorio.
--  * Al caer, reapareces en el Hospital General y pagas la consulta.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Debris = game:GetService("Debris")

local Config = require(ReplicatedStorage.Shared.Config)
local Weapons = require(ReplicatedStorage.Shared.Weapons)

local Combat = {}

local ctx
local lastShot = {} -- [player] = os.clock()
local reloading = {} -- [player] = true
local downedBy = {} -- [player] = { Killer = player, Time = os.clock() }

function Combat.IsSafe(pos)
	for _, z in ipairs(Config.SAFE_ZONES) do
		local d = Vector2.new(pos.X - z.Center.X, pos.Z - z.Center.Z).Magnitude
		if d < z.Radius then
			return true, z.Name
		end
	end
	return false
end

-- Herramientas -----------------------------------------------------------------
function Combat.MakeWeapon(id)
	local def = Weapons.Get(id)
	if not def then
		return nil
	end
	local tool = Instance.new("Tool")
	tool.Name = def.Name
	tool.CanBeDropped = false
	tool.ToolTip = def.Type == "Gun" and ("Daño " .. def.Damage .. (def.Pellets and (" ×" .. def.Pellets) or "") .. " · Cargador " .. def.Mag)
		or (def.Type == "Taser" and "Paraliza " .. def.Stun .. " s") or ("Daño " .. def.Damage)
	tool:SetAttribute("WeaponId", id)
	if id == "Macana" or id == "Taser" or id == "RifleSSC" then
		tool:SetAttribute("PoliceOnly", true) -- se retira al dejar la SSC
	end
	tool:SetAttribute("Type", def.Type)
	tool:SetAttribute("Auto", def.Auto == true)
	tool:SetAttribute("Cooldown", def.Cooldown)
	if def.Mag then
		tool:SetAttribute("Ammo", def.Mag)
		tool:SetAttribute("Mag", def.Mag)
	end
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = def.Size
	handle.Color = def.Color
	handle.Material = Enum.Material.Metal
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = tool
	local muzzle = Instance.new("Attachment")
	muzzle.Name = "Muzzle"
	muzzle.Position = Vector3.new(0, 0, -def.Size.Z / 2)
	muzzle.Parent = handle
	tool.Grip = CFrame.new(0, -def.Size.Y * 0.2, def.Size.Z * 0.2)
	return tool
end

function Combat.Give(player, id)
	local backpack = player:FindFirstChild("Backpack")
	if not backpack then
		return false
	end
	local def = Weapons.Get(id)
	for _, c in ipairs({ backpack, player.Character }) do
		if c then
			for _, t in ipairs(c:GetChildren()) do
				if t:IsA("Tool") and t:GetAttribute("WeaponId") == id then
					if def.Mag then
						t:SetAttribute("Ammo", def.Mag) -- recompra = recarga completa
					end
					return true
				end
			end
		end
	end
	local tool = Combat.MakeWeapon(id)
	tool.Parent = backpack
	return true
end

-- Daño -------------------------------------------------------------------------
local function playerFromModel(model)
	return model and Players:GetPlayerFromCharacter(model)
end

-- ¿Puede `attacker` (jugador o nil si es NPC) lastimar al modelo `victimModel`?
local function canDamage(attacker, victimModel)
	if victimModel:GetAttribute("NpcId") then
		return false -- los personajes de la historia no reciben daño
	end
	if not attacker and victimModel:GetAttribute("Enemy") then
		return false -- los enemigos no se lastiman entre ellos
	end
	local root = victimModel:FindFirstChild("HumanoidRootPart")
	if root and Combat.IsSafe(root.Position) then
		return false, "Zona segura: aquí no se permiten peleas."
	end
	if attacker and attacker.Character then
		local aroot = attacker.Character:FindFirstChild("HumanoidRootPart")
		if aroot and Combat.IsSafe(aroot.Position) then
			return false, "No puedes atacar desde una zona segura."
		end
	end
	local victim = playerFromModel(victimModel)
	if not victim then
		return true -- NPC
	end
	if victim:GetAttribute("JailedUntil") then
		return false
	end
	if attacker and attacker:GetAttribute("Job") == "Policia" then
		if victim:GetAttribute("Job") == "Policia" then
			return false, "No dispares a tus compañeros."
		end
		if not victim:GetAttribute("Wanted") then
			return false, "Solo puedes usar la fuerza contra sospechosos buscados."
		end
	end
	return true
end

local function popDamage(model, text, color)
	local head = model:FindFirstChild("Head")
	if not head then
		return
	end
	local bb = Instance.new("BillboardGui")
	bb.Size = UDim2.fromOffset(80, 30)
	bb.StudsOffsetWorldSpace = Vector3.new(math.random(-10, 10) / 10, 2.5, 0)
	bb.AlwaysOnTop = true
	bb.MaxDistance = 120
	local l = Instance.new("TextLabel")
	l.Size = UDim2.fromScale(1, 1)
	l.BackgroundTransparency = 1
	l.Font = Enum.Font.GothamBlack
	l.TextScaled = true
	l.TextColor3 = color or Color3.fromRGB(255, 230, 90)
	l.TextStrokeTransparency = 0.3
	l.Text = text
	l.Parent = bb
	bb.Parent = head
	Debris:AddItem(bb, 0.8)
end

-- Aplica daño. attacker puede ser nil (NPC). Devuelve true si se aplicó.
function Combat.Damage(attacker, victimModel, amount)
	local hum = victimModel:FindFirstChildOfClass("Humanoid")
	if not hum or hum.Health <= 0 then
		return false
	end
	local ok, reason = canDamage(attacker, victimModel)
	if not ok then
		if reason and attacker then
			ctx.Notify(attacker, reason, "info")
		end
		return false
	end
	local victim = playerFromModel(victimModel)
	-- Cualquier ataque de un no-policía a otro jugador es delito
	if attacker and victim and attacker:GetAttribute("Job") ~= "Policia" then
		if not attacker:GetAttribute("Wanted") then
			ctx.Notify(attacker, "¡Atacaste a alguien! La policía te busca.", "bad")
			ctx.NotifyJob("Policia", "🚨 Radio SSC: agresión reportada. Sospechoso: " .. attacker.DisplayName, "alert")
		end
		ctx.Crime.SetWanted(attacker, Config.ASSAULT_WANTED)
	end
	if victim and attacker then
		downedBy[victim] = { Killer = attacker, Time = os.clock() }
	end
	if attacker then
		victimModel:SetAttribute("LastAttacker", attacker.UserId)
	end
	hum:TakeDamage(amount)
	popDamage(victimModel, "-" .. math.floor(amount))
	return true
end

local function stun(victimModel, seconds)
	local hum = victimModel:FindFirstChildOfClass("Humanoid")
	if not hum or victimModel:GetAttribute("Stunned") then
		return
	end
	victimModel:SetAttribute("Stunned", true)
	local speed, jump = hum.WalkSpeed, hum.JumpPower
	hum.WalkSpeed = 0
	hum.JumpPower = 0
	hum.PlatformStand = true
	popDamage(victimModel, "⚡", Color3.fromRGB(120, 200, 255))
	task.delay(seconds, function()
		if hum.Parent then
			hum.PlatformStand = false
			hum.WalkSpeed = speed
			hum.JumpPower = jump
		end
		victimModel:SetAttribute("Stunned", nil)
	end)
end

-- Disparos -----------------------------------------------------------------
local function findHumanoidModel(inst)
	while inst and inst ~= workspace do
		if inst:IsA("Model") and inst:FindFirstChildOfClass("Humanoid") then
			return inst
		end
		inst = inst.Parent
	end
	return nil
end

local function spreadDir(dir, degrees)
	local cf = CFrame.lookAt(Vector3.zero, dir)
	local a = math.rad(degrees)
	return (cf * CFrame.Angles((math.random() - 0.5) * a, (math.random() - 0.5) * a, 0)).LookVector
end

-- Disparo genérico usado por jugadores y NPCs. Devuelve el modelo golpeado (o nil).
function Combat.Fire(shooterModel, attackerPlayer, def, origin, target, damageMult)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { shooterModel }
	local hits = {}
	local pellets = def.Pellets or 1
	for _ = 1, pellets do
		local dir = spreadDir((target - origin).Unit, def.Spread or 1)
		local result = workspace:Raycast(origin, dir * def.Range, params)
		local endPos = result and result.Position or (origin + dir * def.Range)
		ctx.Remotes.ShotFx:FireAllClients(origin, endPos, def.Type)
		if result then
			local model = findHumanoidModel(result.Instance)
			if model then
				local dmg = (def.Damage or 0) * (damageMult or 1)
				if result.Instance.Name == "Head" then
					dmg = dmg * 1.5
				end
				hits[model] = (hits[model] or 0) + dmg
			end
		end
	end
	local any
	for model, dmg in pairs(hits) do
		if def.Type == "Taser" then
			local ok, reason = canDamage(attackerPlayer, model)
			if ok then
				stun(model, def.Stun)
				any = model
			elseif reason and attackerPlayer then
				ctx.Notify(attackerPlayer, reason, "info")
			end
		elseif Combat.Damage(attackerPlayer, model, dmg) then
			any = model
		end
	end
	return any
end

local function equippedWeapon(player)
	local char = player.Character
	local tool = char and char:FindFirstChildOfClass("Tool")
	if not tool then
		return nil
	end
	local id = tool:GetAttribute("WeaponId")
	return tool, id and Weapons.Get(id)
end

local function onShoot(player, target)
	if typeof(target) ~= "Vector3" then
		return
	end
	local tool, def = equippedWeapon(player)
	local char = player.Character
	local hum = char and char:FindFirstChildOfClass("Humanoid")
	local head = char and char:FindFirstChild("Head")
	if not def or not hum or hum.Health <= 0 or not head or char:GetAttribute("Stunned") then
		return
	end
	if player:GetAttribute("JailedUntil") or reloading[player] then
		return
	end
	local now = os.clock()
	if lastShot[player] and now - lastShot[player] < def.Cooldown * 0.85 then
		return
	end
	lastShot[player] = now

	if def.Type == "Melee" then
		local root = char:FindFirstChild("HumanoidRootPart")
		local best, bestD = nil, def.Range
		for _, model in ipairs(Combat.GetTargets()) do
			if model ~= char then
				local r = model:FindFirstChild("HumanoidRootPart")
				local h = model:FindFirstChildOfClass("Humanoid")
				if r and h and h.Health > 0 then
					local d = (r.Position - root.Position).Magnitude
					local facingDot = (r.Position - root.Position).Unit:Dot(root.CFrame.LookVector)
					if d < bestD and facingDot > 0.3 then
						best, bestD = model, d
					end
				end
			end
		end
		if best then
			Combat.Damage(player, best, def.Damage)
		end
		return
	end

	local ammo = tool:GetAttribute("Ammo") or 0
	if ammo <= 0 then
		return
	end
	tool:SetAttribute("Ammo", ammo - 1)
	local muzzle = tool.Handle:FindFirstChild("Muzzle")
	local origin = head.Position
	if (target - origin).Magnitude < 1 then
		return
	end
	Combat.Fire(char, player, def, origin, target)
	if muzzle then
		ctx.Remotes.ShotFx:FireAllClients(muzzle.WorldPosition, nil, "Flash")
	end
end

local function onReload(player)
	local tool, def = equippedWeapon(player)
	if not def or not def.Mag or reloading[player] then
		return
	end
	if tool:GetAttribute("Ammo") == def.Mag then
		return
	end
	reloading[player] = true
	tool:SetAttribute("Reloading", true)
	task.delay(def.Reload, function()
		reloading[player] = nil
		if tool.Parent then
			tool:SetAttribute("Ammo", def.Mag)
			tool:SetAttribute("Reloading", nil)
		end
	end)
end

-- Todos los modelos con Humanoid que pueden recibir golpes
function Combat.GetTargets()
	local list = {}
	for _, p in ipairs(Players:GetPlayers()) do
		if p.Character then
			table.insert(list, p.Character)
		end
	end
	if ctx.Missions then
		for _, npc in ipairs(ctx.Missions.GetEnemies()) do
			table.insert(list, npc)
		end
	end
	return list
end

-- Tiendas de armas -------------------------------------------------------------
local function canUseShop(player, shop)
	if not shop.Jobs then
		return true
	end
	for _, j in ipairs(shop.Jobs) do
		if player:GetAttribute("Job") == j then
			return true
		end
	end
	return false
end

local function onBuyWeapon(player, shopIndex, weaponId)
	if type(shopIndex) ~= "number" or type(weaponId) ~= "string" then
		return
	end
	local entry = ctx.Map.WeaponShops[shopIndex]
	local shop = entry and Weapons.Shops[entry.ShopId]
	local root = player.Character and player.Character:FindFirstChild("HumanoidRootPart")
	if not shop or not root or (root.Position - entry.Part.Position).Magnitude > 20 then
		return
	end
	if not canUseShop(player, shop) then
		ctx.Notify(player, "Aquí no te atienden con ese trabajo.", "bad")
		return
	end
	for _, item in ipairs(shop.Items) do
		if item.Id == weaponId then
			if item.Price > 0 and not ctx.Economy.Charge(player, item.Price) then
				ctx.Notify(player, "No te alcanza. Cuesta $" .. item.Price .. ".", "bad")
				return
			end
			Combat.Give(player, weaponId)
			local def = Weapons.Get(weaponId)
			ctx.Notify(player, (item.Price > 0 and "Compraste " or "Recibiste ") .. def.Name .. ". Equípala con su número y haz clic para usarla. [R] recarga.", "good")
			return
		end
	end
end

-- Muerte y hospital -------------------------------------------------------------
local function onCharacter(player, char)
	local hum = char:WaitForChild("Humanoid", 10)
	if not hum then
		return
	end
	hum.BreakJointsOnDeath = false -- sin desmembramiento
	hum.Died:Connect(function()
		local info = downedBy[player]
		downedBy[player] = nil
		local killer = info and (os.clock() - info.Time < 10) and info.Killer
		if killer and killer.Parent and killer:GetAttribute("Job") == "Policia" and player:GetAttribute("Wanted") then
			player:SetAttribute("PendingJail", true)
			ctx.Economy.Add(killer, math.floor(Config.ARREST_REWARD / 2))
			ctx.Notify(killer, "Sospechoso abatido. Será trasladado al Reclusorio. +$" .. math.floor(Config.ARREST_REWARD / 2), "money")
		else
			player:SetAttribute("PendingHospital", true)
		end
		if ctx.Missions then
			ctx.Missions.OnPlayerDied(player)
		end
	end)
	-- ¿Reaparece después de caer?
	if player:GetAttribute("PendingJail") then
		player:SetAttribute("PendingJail", nil)
		task.wait(0.3)
		ctx.Crime.Jail(player, nil)
	elseif player:GetAttribute("PendingHospital") then
		player:SetAttribute("PendingHospital", nil)
		if not player:GetAttribute("JailedUntil") then
			char:WaitForChild("HumanoidRootPart", 10)
			task.wait(0.2)
			char:PivotTo(ctx.Map.HospitalCFrame)
			local fee = math.min(Config.HOSPITAL_FEE, ctx.Economy.Get(player))
			ctx.Economy.Charge(player, fee)
			ctx.Notify(player, "Te atendieron en el Hospital General. La consulta costó $" .. fee .. ".", "info")
		end
	end
	-- Equipo policial básico al reaparecer
	if player:GetAttribute("Job") == "Policia" then
		player:WaitForChild("Backpack", 10)
		Combat.Give(player, "Taser")
	end
end

function Combat.Init(context)
	ctx = context
	ctx.Remotes.Shoot.OnServerEvent:Connect(onShoot)
	ctx.Remotes.Reload.OnServerEvent:Connect(onReload)
	ctx.Remotes.BuyWeapon.OnServerEvent:Connect(onBuyWeapon)
	for index, entry in ipairs(ctx.Map.WeaponShops) do
		entry.Prompt.Triggered:Connect(function(player)
			local shop = Weapons.Shops[entry.ShopId]
			if not canUseShop(player, shop) then
				if entry.ShopId == "SSC" then
					ctx.Notify(player, "Solo personal de la SSC.", "bad")
				else
					ctx.Notify(player, "El Tuerto te mira raro: \"Yo no vendo nada, joven\". (Solo rateros)", "info")
				end
				return
			end
			ctx.Remotes.OpenWeaponShop:FireClient(player, index, entry.ShopId)
		end)
	end
	local function onPlayer(player)
		player.CharacterAdded:Connect(function(char)
			onCharacter(player, char)
		end)
		if player.Character then
			task.spawn(onCharacter, player, player.Character)
		end
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, p in ipairs(Players:GetPlayers()) do
		onPlayer(p)
	end
	Players.PlayerRemoving:Connect(function(p)
		lastShot[p] = nil
		reloading[p] = nil
		downedBy[p] = nil
	end)
end

return Combat
