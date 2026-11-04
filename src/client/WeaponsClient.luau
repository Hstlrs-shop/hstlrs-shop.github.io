-- WeaponsClient: disparo, recarga, contador de munición y efectos visuales.
-- El servidor valida cada disparo (ver server/Combat.luau).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Debris = game:GetService("Debris")

local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local player = Players.LocalPlayer
local mouse = player:GetMouse()

local WeaponsClient = {}

local UI
local ammoFrame, ammoLabel, nameLabel
local equipped -- Tool equipado con WeaponId
local firing = false
local bound = setmetatable({}, { __mode = "k" }) -- herramientas ya conectadas

local function updateAmmo()
	if not equipped then
		ammoFrame.Visible = false
		return
	end
	ammoFrame.Visible = true
	nameLabel.Text = equipped.Name
	local mag = equipped:GetAttribute("Mag")
	if equipped:GetAttribute("Reloading") then
		ammoLabel.Text = "Recargando..."
	elseif mag then
		ammoLabel.Text = (equipped:GetAttribute("Ammo") or 0) .. " / " .. mag
	else
		ammoLabel.Text = "Cuerpo a cuerpo"
	end
end

local function fireOnce()
	if not equipped then
		return false
	end
	local mag = equipped:GetAttribute("Mag")
	if mag and (equipped:GetAttribute("Ammo") or 0) <= 0 then
		if not equipped:GetAttribute("Reloading") then
			Remotes.Reload:FireServer()
		end
		return false
	end
	Remotes.Shoot:FireServer(mouse.Hit.Position)
	return true
end

local function startFiring()
	if not equipped or firing then
		return
	end
	if not equipped:GetAttribute("Auto") then
		fireOnce()
		return
	end
	firing = true
	local tool = equipped
	task.spawn(function()
		while firing and equipped == tool do
			if not fireOnce() then
				break
			end
			task.wait(tool:GetAttribute("Cooldown") or 0.1)
		end
		firing = false
	end)
end

local function bindTool(tool)
	if not tool:IsA("Tool") or not tool:GetAttribute("WeaponId") or bound[tool] then
		return
	end
	bound[tool] = true
	tool.Activated:Connect(startFiring)
	tool.Deactivated:Connect(function()
		firing = false
	end)
	tool.Equipped:Connect(function()
		equipped = tool
		updateAmmo()
	end)
	tool.Unequipped:Connect(function()
		if equipped == tool then
			equipped = nil
			firing = false
		end
		updateAmmo()
	end)
	tool:GetAttributeChangedSignal("Ammo"):Connect(updateAmmo)
	tool:GetAttributeChangedSignal("Reloading"):Connect(updateAmmo)
end

-- Efectos: trazadoras y fogonazos (solo visuales, locales)
local function onShotFx(origin, endPos, kind)
	if kind == "Flash" then
		local f = Instance.new("Part")
		f.Anchored = true
		f.CanCollide = false
		f.CanQuery = false
		f.Material = Enum.Material.Neon
		f.Color = Color3.fromRGB(255, 210, 120)
		f.Shape = Enum.PartType.Ball
		f.Size = Vector3.new(0.8, 0.8, 0.8)
		f.CFrame = CFrame.new(origin)
		f.Parent = workspace
		Debris:AddItem(f, 0.05)
		return
	end
	if not endPos then
		return
	end
	local len = (endPos - origin).Magnitude
	if len < 0.5 then
		return
	end
	local t = Instance.new("Part")
	t.Anchored = true
	t.CanCollide = false
	t.CanQuery = false
	t.CastShadow = false
	t.Material = Enum.Material.Neon
	t.Color = kind == "Taser" and Color3.fromRGB(120, 200, 255) or Color3.fromRGB(255, 220, 120)
	t.Size = Vector3.new(0.12, 0.12, len)
	t.CFrame = CFrame.lookAt(origin, endPos) * CFrame.new(0, 0, -len / 2)
	t.Transparency = 0.2
	t.Parent = workspace
	Debris:AddItem(t, 0.07)
	-- Chispa en el impacto (sin sangre)
	local s = Instance.new("Part")
	s.Anchored = true
	s.CanCollide = false
	s.CanQuery = false
	s.Material = Enum.Material.Neon
	s.Color = Color3.fromRGB(255, 240, 200)
	s.Shape = Enum.PartType.Ball
	s.Size = Vector3.new(0.5, 0.5, 0.5)
	s.CFrame = CFrame.new(endPos)
	s.Parent = workspace
	Debris:AddItem(s, 0.08)
end

function WeaponsClient.Init(uiModule)
	UI = uiModule
	local new = UI.New
	ammoFrame = new("Frame", {
		Name = "Municion",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -12, 1, -120),
		Size = UDim2.fromOffset(200, 60),
		BackgroundColor3 = UI.Theme.Bg,
		BackgroundTransparency = 0.15,
		Visible = false,
		Parent = UI.Gui,
	}, { UI.Corner(10), UI.Padding(8) })
	nameLabel = new("TextLabel", {
		Size = UDim2.new(1, 0, 0, 16), BackgroundTransparency = 1, Font = Enum.Font.GothamBold, TextSize = 13,
		TextColor3 = UI.Theme.Muted, TextXAlignment = Enum.TextXAlignment.Right, Parent = ammoFrame,
	})
	ammoLabel = new("TextLabel", {
		Position = UDim2.fromOffset(0, 18), Size = UDim2.new(1, 0, 0, 26), BackgroundTransparency = 1,
		Font = Enum.Font.GothamBlack, TextSize = 24, TextColor3 = UI.Theme.Text, TextXAlignment = Enum.TextXAlignment.Right,
		Parent = ammoFrame,
	})

	local function watch(container)
		for _, c in ipairs(container:GetChildren()) do
			bindTool(c)
		end
		container.ChildAdded:Connect(bindTool)
	end
	local function onCharacter(char)
		equipped = nil
		firing = false
		updateAmmo()
		watch(char)
		watch(player:WaitForChild("Backpack"))
	end
	if player.Character then
		task.spawn(onCharacter, player.Character)
	end
	player.CharacterAdded:Connect(onCharacter)

	UserInputService.InputBegan:Connect(function(input, processed)
		if not processed and input.KeyCode == Enum.KeyCode.R and equipped then
			Remotes.Reload:FireServer()
		end
	end)
	Remotes.ShotFx.OnClientEvent:Connect(onShotFx)
end

return WeaponsClient
