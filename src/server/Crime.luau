-- Crime: asaltos a tienditas, nivel de búsqueda, arrestos y reclusorio.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Crime = {}

local ctx -- { Remotes, Economy, Notify, Map }
local storeCooldown = {} -- [prompt] = os.clock() del último asalto

local function teleport(player, cf)
	local char = player.Character
	if char then
		char:PivotTo(cf)
	end
end

local function jailCFrame()
	local c = ctx.Map.JailCenter
	local r = ctx.Map.JailRadius
	return CFrame.new(c + Vector3.new(math.random(-r, r), 0, math.random(-r, r) + 10))
end

local function notifyJob(jobId, text, kind)
	for _, p in ipairs(Players:GetPlayers()) do
		if p:GetAttribute("Job") == jobId then
			ctx.Notify(p, text, kind)
		end
	end
end

function Crime.SetWanted(player)
	player:SetAttribute("Wanted", true)
	player:SetAttribute("WantedUntil", os.time() + Config.WANTED_DURATION)
end

function Crime.ClearWanted(player)
	player:SetAttribute("Wanted", nil)
	player:SetAttribute("WantedUntil", nil)
end

function Crime.Jail(player, officer)
	Crime.ClearWanted(player)
	player:SetAttribute("JailedUntil", os.time() + Config.JAIL_TIME)
	teleport(player, jailCFrame())
	local by = officer and (" por " .. officer.DisplayName) or ""
	ctx.Notify(player, "Fuiste arrestado" .. by .. ". " .. Config.JAIL_TIME .. "s en el Reclusorio.", "bad")
end

function Crime.TryArrest(officer)
	if officer:GetAttribute("Job") ~= "Policia" then
		return
	end
	local oChar = officer.Character
	local oRoot = oChar and oChar:FindFirstChild("HumanoidRootPart")
	if not oRoot then
		return
	end
	local target, best = nil, Config.ARREST_RANGE
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= officer and p:GetAttribute("Wanted") and p.Character then
			local root = p.Character:FindFirstChild("HumanoidRootPart")
			if root then
				local d = (root.Position - oRoot.Position).Magnitude
				if d <= best then
					target, best = p, d
				end
			end
		end
	end
	if not target then
		ctx.Notify(officer, "No hay ningún sospechoso buscado al alcance.", "info")
		return
	end
	Crime.Jail(target, officer)
	ctx.Economy.Add(officer, Config.ARREST_REWARD)
	ctx.Notify(officer, "¡Arrestaste a " .. target.DisplayName .. "! +$" .. Config.ARREST_REWARD, "money")
end

local function onRob(player, robbable)
	if player:GetAttribute("Job") ~= "Ladron" then
		ctx.Notify(player, "Solo los rateros asaltan tienditas. ¡Aquí se trabaja honradamente!", "info")
		return
	end
	if player:GetAttribute("JailedUntil") then
		return
	end
	local last = storeCooldown[robbable.Prompt]
	if last and os.clock() - last < Config.ROBBERY_COOLDOWN then
		local left = math.ceil(Config.ROBBERY_COOLDOWN - (os.clock() - last))
		ctx.Notify(player, "La caja está vacía. Vuelve en " .. left .. "s.", "info")
		return
	end
	storeCooldown[robbable.Prompt] = os.clock()
	local loot = math.random(Config.ROBBERY_MIN, Config.ROBBERY_MAX)
	ctx.Economy.Add(player, loot)
	Crime.SetWanted(player)
	ctx.Notify(player, "¡Te llevaste $" .. loot .. "! La policía te busca por " .. Config.WANTED_DURATION .. "s.", "money")
	notifyJob("Policia", "🚨 ¡Asalto en " .. robbable.Name .. "! Sospechoso: " .. player.DisplayName, "alert")
end

function Crime.Init(context)
	ctx = context
	for _, robbable in ipairs(ctx.Map.Robbables) do
		robbable.Prompt.Triggered:Connect(function(player)
			onRob(player, robbable)
		end)
	end

	-- Si alguien reaparece mientras está preso, vuelve a la cárcel
	local function onPlayer(player)
		player.CharacterAdded:Connect(function(char)
			if player:GetAttribute("JailedUntil") then
				char:WaitForChild("HumanoidRootPart", 10)
				task.wait(0.2)
				teleport(player, jailCFrame())
			end
		end)
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, p in ipairs(Players:GetPlayers()) do
		onPlayer(p)
	end

	-- Reloj: expira búsqueda y libera presos
	task.spawn(function()
		while true do
			task.wait(1)
			local now = os.time()
			for _, p in ipairs(Players:GetPlayers()) do
				local wantedUntil = p:GetAttribute("WantedUntil")
				if wantedUntil and now >= wantedUntil then
					Crime.ClearWanted(p)
					ctx.Notify(p, "La policía dejó de buscarte... por ahora.", "info")
				end
				local jailedUntil = p:GetAttribute("JailedUntil")
				if jailedUntil and now >= jailedUntil then
					p:SetAttribute("JailedUntil", nil)
					teleport(p, ctx.Map.ReleaseCFrame)
					ctx.Notify(p, "Cumpliste tu condena. ¡Pórtate bien!", "good")
				end
			end
		end
	end)
end

return Crime
