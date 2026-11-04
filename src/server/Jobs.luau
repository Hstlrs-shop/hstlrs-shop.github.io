-- Jobs: trabajos, equipos, herramientas de trabajo, sueldo y etiqueta sobre la cabeza.

local Players = game:GetService("Players")
local Teams = game:GetService("Teams")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Jobs = {}

local ctx -- { Remotes, Economy, Notify, Crime }
local teams = {}
local lastChange = {}
local lastHeal = {}

-- Herramientas -------------------------------------------------------------
local function makeTool(name, color, size)
	local tool = Instance.new("Tool")
	tool.Name = name
	tool.CanBeDropped = false
	tool:SetAttribute("JobTool", true)
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = size or Vector3.new(1, 1, 1)
	handle.Color = color
	handle.Material = Enum.Material.SmoothPlastic
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = tool
	return tool
end

local function nearestPlayer(from, range, filter)
	local fromChar = from.Character
	local fromRoot = fromChar and fromChar:FindFirstChild("HumanoidRootPart")
	if not fromRoot then
		return nil
	end
	local best, bestDist = nil, range
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= from and other.Character then
			local root = other.Character:FindFirstChild("HumanoidRootPart")
			local hum = other.Character:FindFirstChildOfClass("Humanoid")
			if root and hum and hum.Health > 0 and (not filter or filter(other, hum)) then
				local d = (root.Position - fromRoot.Position).Magnitude
				if d <= bestDist then
					best, bestDist = other, d
				end
			end
		end
	end
	return best
end

local function giveHandcuffs(player)
	local tool = makeTool("Esposas", Color3.fromRGB(160, 160, 170), Vector3.new(1.2, 0.3, 0.6))
	tool.ToolTip = "Arresta a un ratero buscado cercano"
	tool.Activated:Connect(function()
		ctx.Crime.TryArrest(player)
	end)
	tool.Parent = player.Backpack
	if ctx.Combat then
		ctx.Combat.Give(player, "Taser")
	end
end

local function giveMedkit(player)
	local tool = makeTool("Botiquín", Color3.fromRGB(220, 30, 30), Vector3.new(1.4, 1, 0.8))
	tool.ToolTip = "Cura al jugador herido más cercano"
	tool.Activated:Connect(function()
		local now = os.clock()
		if lastHeal[player] and now - lastHeal[player] < Config.HEAL_COOLDOWN then
			return
		end
		local target = nearestPlayer(player, Config.HEAL_RANGE, function(_, hum)
			return hum.Health < hum.MaxHealth
		end)
		if not target then
			ctx.Notify(player, "No hay nadie herido cerca.", "info")
			return
		end
		lastHeal[player] = now
		local hum = target.Character:FindFirstChildOfClass("Humanoid")
		hum.Health = math.min(hum.MaxHealth, hum.Health + Config.HEAL_AMOUNT)
		ctx.Economy.Add(player, Config.HEAL_REWARD)
		ctx.Notify(player, "Curaste a " .. target.DisplayName .. " (+$" .. Config.HEAL_REWARD .. ")", "good")
		ctx.Notify(target, "Un paramédico te atendió. ¡Que te mejores!", "good")
	end)
	tool.Parent = player.Backpack
end

local JOB_TOOLS = {
	Policia = giveHandcuffs,
	Paramedico = giveMedkit,
}

local function clearJobTools(player)
	local containers = { player:FindFirstChild("Backpack"), player.Character }
	for _, c in ipairs(containers) do
		if c then
			for _, t in ipairs(c:GetChildren()) do
				local policeGear = t:GetAttribute("PoliceOnly") and player:GetAttribute("Job") ~= "Policia"
				if t:IsA("Tool") and (t:GetAttribute("JobTool") or policeGear) then
					t:Destroy()
				end
			end
		end
	end
end

local function giveJobTools(player)
	clearJobTools(player)
	local giver = JOB_TOOLS[player:GetAttribute("Job")]
	if giver and player:FindFirstChild("Backpack") then
		giver(player)
	end
end

-- Etiqueta sobre la cabeza ---------------------------------------------------
local function updateTag(player)
	local char = player.Character
	local head = char and char:FindFirstChild("Head")
	if not head then
		return
	end
	local tag = head:FindFirstChild("RPTag")
	if not tag then
		tag = Instance.new("BillboardGui")
		tag.Name = "RPTag"
		tag.Size = UDim2.fromOffset(200, 60)
		tag.StudsOffset = Vector3.new(0, 2.6, 0)
		tag.MaxDistance = 80
		local list = Instance.new("UIListLayout")
		list.HorizontalAlignment = Enum.HorizontalAlignment.Center
		list.Parent = tag
		for i, name in ipairs({ "Nombre", "Trabajo", "Estado" }) do
			local l = Instance.new("TextLabel")
			l.Name = name
			l.LayoutOrder = i
			l.Size = UDim2.new(1, 0, 0, i == 1 and 22 or 18)
			l.BackgroundTransparency = 1
			l.Font = Enum.Font.GothamBold
			l.TextScaled = true
			l.TextStrokeTransparency = 0.3
			l.TextColor3 = Color3.new(1, 1, 1)
			l.Parent = tag
		end
		tag.Parent = head
		local hum = char:FindFirstChildOfClass("Humanoid")
		if hum then
			hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
		end
	end
	local job = Config.GetJob(player:GetAttribute("Job")) or Config.Jobs[1]
	tag.Nombre.Text = player.DisplayName
	tag.Trabajo.Text = job.Name
	tag.Trabajo.TextColor3 = BrickColor.new(job.Color).Color:Lerp(Color3.new(1, 1, 1), 0.35)
	local status = tag.Estado
	if player:GetAttribute("JailedUntil") then
		status.Text = "EN EL RECLUSORIO"
		status.TextColor3 = Color3.fromRGB(255, 160, 60)
		status.Visible = true
	elseif player:GetAttribute("Wanted") then
		status.Text = "¡SE BUSCA!"
		status.TextColor3 = Color3.fromRGB(255, 60, 60)
		status.Visible = true
	else
		status.Visible = false
	end
end
Jobs.UpdateTag = updateTag

-- API ----------------------------------------------------------------------
function Jobs.Set(player, jobId)
	local job = Config.GetJob(jobId)
	if not job then
		return false
	end
	player:SetAttribute("Job", job.Id)
	player.Team = teams[job.Id]
	giveJobTools(player)
	updateTag(player)
	return true
end

local function onChangeJob(player, jobId)
	if type(jobId) ~= "string" or not Config.GetJob(jobId) then
		return
	end
	if player:GetAttribute("Job") == jobId then
		return
	end
	if player:GetAttribute("JailedUntil") then
		ctx.Notify(player, "No puedes cambiar de trabajo desde el reclusorio.", "bad")
		return
	end
	if player:GetAttribute("Wanted") then
		ctx.Notify(player, "Estás buscado por la policía. ¡No puedes cambiar de trabajo!", "bad")
		return
	end
	local now = os.clock()
	if lastChange[player] and now - lastChange[player] < Config.JOB_CHANGE_COOLDOWN then
		ctx.Notify(player, "Espera unos segundos antes de cambiar otra vez.", "info")
		return
	end
	lastChange[player] = now
	Jobs.Set(player, jobId)
	local job = Config.GetJob(jobId)
	ctx.Notify(player, "Ahora eres " .. job.Name .. ". Sueldo: $" .. job.Salary .. " cada " .. Config.PAYCHECK_INTERVAL .. "s", "good")
end

function Jobs.Init(context)
	ctx = context
	for _, job in ipairs(Config.Jobs) do
		local team = Teams:FindFirstChild(job.Name) or Instance.new("Team")
		team.Name = job.Name
		team.TeamColor = BrickColor.new(job.Color)
		team.AutoAssignable = false
		team.Parent = Teams
		teams[job.Id] = team
	end

	ctx.Remotes.ChangeJob.OnServerEvent:Connect(onChangeJob)

	local function onPlayer(player)
		player:SetAttribute("Job", "Ciudadano")
		player.Team = teams.Ciudadano
		local function onCharacter(char)
			char:WaitForChild("Head", 10)
			player:WaitForChild("Backpack", 10)
			giveJobTools(player)
			updateTag(player)
		end
		player.CharacterAdded:Connect(onCharacter)
		if player.Character then
			task.spawn(onCharacter, player.Character)
		end
		player:GetAttributeChangedSignal("Wanted"):Connect(function()
			updateTag(player)
		end)
		player:GetAttributeChangedSignal("JailedUntil"):Connect(function()
			updateTag(player)
		end)
	end
	Players.PlayerAdded:Connect(onPlayer)
	for _, p in ipairs(Players:GetPlayers()) do
		onPlayer(p)
	end
	Players.PlayerRemoving:Connect(function(p)
		lastChange[p] = nil
		lastHeal[p] = nil
	end)

	-- Sueldo
	task.spawn(function()
		while true do
			task.wait(Config.PAYCHECK_INTERVAL)
			for _, p in ipairs(Players:GetPlayers()) do
				local job = Config.GetJob(p:GetAttribute("Job"))
				if job and job.Salary > 0 and not p:GetAttribute("JailedUntil") then
					ctx.Economy.Add(p, job.Salary)
					ctx.Notify(p, "¡Día de pago! +$" .. job.Salary .. " (" .. job.Name .. ")", "money")
				end
			end
		end
	end)
end

return Jobs
