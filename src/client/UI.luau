-- UI: interfaz del jugador construida por código.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local player = Players.LocalPlayer

local UI = {}

local THEME = {
	Bg = Color3.fromRGB(25, 25, 30),
	Panel = Color3.fromRGB(35, 35, 42),
	Row = Color3.fromRGB(48, 48, 58),
	Text = Color3.fromRGB(245, 245, 245),
	Muted = Color3.fromRGB(180, 180, 190),
	Pink = Color3.fromRGB(235, 80, 150),
	Green = Color3.fromRGB(0, 140, 90),
	Red = Color3.fromRGB(206, 17, 38),
	Orange = Color3.fromRGB(240, 120, 20),
	Gold = Color3.fromRGB(240, 200, 60),
}

local KIND_COLORS = {
	good = THEME.Green,
	bad = THEME.Red,
	money = Color3.fromRGB(30, 150, 60),
	alert = Color3.fromRGB(180, 20, 40),
	info = Color3.fromRGB(60, 70, 90),
}

local function new(className, props, children)
	local obj = Instance.new(className)
	for k, v in pairs(props or {}) do
		obj[k] = v
	end
	for _, child in ipairs(children or {}) do
		child.Parent = obj
	end
	return obj
end

local function corner(r)
	return new("UICorner", { CornerRadius = UDim.new(0, r or 8) })
end

local function padding(p)
	return new("UIPadding", {
		PaddingTop = UDim.new(0, p), PaddingBottom = UDim.new(0, p),
		PaddingLeft = UDim.new(0, p), PaddingRight = UDim.new(0, p),
	})
end

local function formatMoney(n)
	local s = tostring(math.floor(n))
	local formatted = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	if formatted:sub(1, 1) == "," then
		formatted = formatted:sub(2)
	end
	return "$" .. formatted
end

local function button(text, color, size)
	return new("TextButton", {
		Text = text,
		Size = size or UDim2.fromOffset(110, 36),
		BackgroundColor3 = color or THEME.Pink,
		TextColor3 = THEME.Text,
		Font = Enum.Font.GothamBold,
		TextSize = 16,
		AutoButtonColor = true,
	}, { corner(8) })
end

-- Raíz -------------------------------------------------------------------
local gui = new("ScreenGui", {
	Name = "CDMX_HUD",
	ResetOnSpawn = false,
	IgnoreGuiInset = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
})

-- Barra superior: dinero y hora
local topBar = new("Frame", {
	Name = "TopBar",
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -12, 0, 12),
	Size = UDim2.fromOffset(220, 74),
	BackgroundColor3 = THEME.Bg,
	BackgroundTransparency = 0.15,
	Parent = gui,
}, { corner(10), padding(8) })
local moneyLabel = new("TextLabel", {
	Size = UDim2.new(1, 0, 0, 32),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBlack,
	TextColor3 = Color3.fromRGB(120, 230, 140),
	TextScaled = true,
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "$0",
	Parent = topBar,
})
local infoLabel = new("TextLabel", {
	Position = UDim2.fromOffset(0, 36),
	Size = UDim2.new(1, 0, 0, 22),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamMedium,
	TextColor3 = THEME.Muted,
	TextScaled = true,
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "",
	Parent = topBar,
})
-- Franja tricolor
local stripe = new("Frame", {
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.new(0, -8, 1, 8),
	Size = UDim2.new(1, 16, 0, 4),
	BackgroundTransparency = 1,
	Parent = topBar,
}, { new("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal }) })
for _, c in ipairs({ THEME.Green, Color3.new(1, 1, 1), THEME.Red }) do
	new("Frame", { Size = UDim2.new(1 / 3, 0, 1, 0), BackgroundColor3 = c, BorderSizePixel = 0, Parent = stripe })
end

-- Estado (se busca / reclusorio)
local statusLabel = new("TextLabel", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -12, 0, 96),
	Size = UDim2.fromOffset(220, 34),
	BackgroundColor3 = THEME.Red,
	Font = Enum.Font.GothamBlack,
	TextColor3 = THEME.Text,
	TextSize = 18,
	Visible = false,
	Parent = gui,
}, { corner(8) })

-- Botón de trabajos
local jobsButton = button("TRABAJOS [J]", THEME.Pink, UDim2.fromOffset(150, 44))
jobsButton.AnchorPoint = Vector2.new(0, 1)
jobsButton.Position = UDim2.new(0, 12, 1, -12)
jobsButton.Parent = gui

-- Notificaciones
local notifyHolder = new("Frame", {
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 12),
	Size = UDim2.new(0, 460, 0, 300),
	BackgroundTransparency = 1,
	Parent = gui,
}, {
	new("UIListLayout", {
		Padding = UDim.new(0, 6),
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		SortOrder = Enum.SortOrder.LayoutOrder,
	}),
	new("UISizeConstraint", { MaxSize = Vector2.new(460, 300) }),
})

-- Fundido para el Metro
local fade = new("Frame", {
	Size = UDim2.fromScale(1, 1),
	BackgroundColor3 = Color3.new(0, 0, 0),
	BackgroundTransparency = 1,
	Visible = false,
	ZIndex = 50,
	Parent = gui,
})
local fadeText = new("TextLabel", {
	Size = UDim2.fromScale(1, 1),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBlack,
	TextColor3 = THEME.Orange,
	TextSize = 32,
	TextTransparency = 1,
	ZIndex = 51,
	Parent = fade,
})

-- Panel genérico ------------------------------------------------------------
local panel = new("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.new(0.9, 0, 0.75, 0),
	BackgroundColor3 = THEME.Panel,
	Visible = false,
	ZIndex = 10,
	Parent = gui,
}, {
	corner(12),
	padding(12),
	new("UISizeConstraint", { MaxSize = Vector2.new(560, 520) }),
})
local panelTitle = new("TextLabel", {
	Size = UDim2.new(1, -50, 0, 36),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBlack,
	TextColor3 = THEME.Text,
	TextSize = 24,
	TextXAlignment = Enum.TextXAlignment.Left,
	ZIndex = 11,
	Parent = panel,
})
local closeBtn = button("X", THEME.Red, UDim2.fromOffset(36, 36))
closeBtn.AnchorPoint = Vector2.new(1, 0)
closeBtn.Position = UDim2.new(1, 0, 0, 0)
closeBtn.ZIndex = 11
closeBtn.Parent = panel
local list = new("ScrollingFrame", {
	Position = UDim2.fromOffset(0, 46),
	Size = UDim2.new(1, 0, 1, -46),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	ScrollBarThickness = 6,
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	CanvasSize = UDim2.new(),
	ZIndex = 11,
	Parent = panel,
}, { new("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }) })

local function closePanel()
	panel.Visible = false
end
closeBtn.MouseButton1Click:Connect(closePanel)

local function openPanel(title)
	for _, c in ipairs(list:GetChildren()) do
		if not c:IsA("UIListLayout") then
			c:Destroy()
		end
	end
	panelTitle.Text = title
	panel.Visible = true
	list.CanvasPosition = Vector2.zero
end

-- Fila: título, subtítulo, botón
local function addRow(order, title, subtitle, accent, btnText, btnColor, onClick)
	local row = new("Frame", {
		LayoutOrder = order,
		Size = UDim2.new(1, -8, 0, 72),
		BackgroundColor3 = THEME.Row,
		ZIndex = 12,
		Parent = list,
	}, { corner(8) })
	new("Frame", { Size = UDim2.new(0, 6, 1, 0), BackgroundColor3 = accent or THEME.Pink, BorderSizePixel = 0, ZIndex = 13, Parent = row }, { corner(3) })
	new("TextLabel", {
		Position = UDim2.fromOffset(16, 8),
		Size = UDim2.new(1, -150, 0, 24),
		BackgroundTransparency = 1,
		Font = Enum.Font.GothamBold,
		TextColor3 = THEME.Text,
		TextSize = 18,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextTruncate = Enum.TextTruncate.AtEnd,
		Text = title,
		ZIndex = 13,
		Parent = row,
	})
	new("TextLabel", {
		Position = UDim2.fromOffset(16, 32),
		Size = UDim2.new(1, -150, 0, 34),
		BackgroundTransparency = 1,
		Font = Enum.Font.Gotham,
		TextColor3 = THEME.Muted,
		TextSize = 13,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		Text = subtitle,
		ZIndex = 13,
		Parent = row,
	})
	local b = button(btnText, btnColor or THEME.Green, UDim2.fromOffset(116, 38))
	b.AnchorPoint = Vector2.new(1, 0.5)
	b.Position = UDim2.new(1, -10, 0.5, 0)
	b.ZIndex = 13
	b.Parent = row
	b.MouseButton1Click:Connect(onClick)
	return row
end

-- Pantallas ------------------------------------------------------------------
local function showJobs()
	openPanel("Bolsa de trabajo CDMX")
	local current = player:GetAttribute("Job")
	for i, job in ipairs(Config.Jobs) do
		local isCurrent = job.Id == current
		local salary = job.Salary > 0 and ("$" .. job.Salary .. "/quincena · ") or ""
		addRow(i, job.Name, salary .. job.Description, BrickColor.new(job.Color).Color,
			isCurrent and "Actual" or "Elegir", isCurrent and THEME.Row or THEME.Green, function()
				if not isCurrent then
					Remotes.ChangeJob:FireServer(job.Id)
					closePanel()
				end
			end)
	end
end

local function showShop(shopIndex, shopId)
	local shop = Config.Shops[shopId]
	if not shop then
		return
	end
	openPanel(shop.Name)
	for i, item in ipairs(shop.Items) do
		addRow(i, item.Name, "Recupera " .. item.Heal .. " de vida", BrickColor.new(item.Color).Color,
			"$" .. item.Price, THEME.Green, function()
				Remotes.BuyItem:FireServer(shopIndex, item.Id)
			end)
	end
end

local function showMetro(currentIndex, names)
	openPanel("Metro - ¿A dónde vas? (boleto $" .. Config.METRO_FARE .. ")")
	local order = 0
	for i, name in ipairs(names) do
		if i ~= currentIndex then
			order = order + 1
			addRow(order, name, "Línea CDMX", THEME.Orange, "Viajar", THEME.Orange, function()
				Remotes.MetroTravel:FireServer(i)
				closePanel()
			end)
		end
	end
end

-- Notificaciones -----------------------------------------------------------
local notifyCount = 0
local function notify(text, kind)
	notifyCount = notifyCount + 1
	local card = new("TextLabel", {
		LayoutOrder = notifyCount,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = KIND_COLORS[kind] or KIND_COLORS.info,
		BackgroundTransparency = 0.1,
		Font = Enum.Font.GothamBold,
		TextColor3 = THEME.Text,
		TextSize = 16,
		TextWrapped = true,
		Text = text,
		Parent = notifyHolder,
	}, { corner(8), padding(10) })
	local children = 0
	for _, c in ipairs(notifyHolder:GetChildren()) do
		if c:IsA("TextLabel") then
			children = children + 1
		end
	end
	if children > 4 then
		-- Borra la más vieja
		local oldest
		for _, c in ipairs(notifyHolder:GetChildren()) do
			if c:IsA("TextLabel") and (not oldest or c.LayoutOrder < oldest.LayoutOrder) then
				oldest = c
			end
		end
		if oldest then
			oldest:Destroy()
		end
	end
	task.delay(4.5, function()
		if card.Parent then
			local info = TweenInfo.new(0.4)
			TweenService:Create(card, info, { BackgroundTransparency = 1, TextTransparency = 1 }):Play()
			task.wait(0.45)
			card:Destroy()
		end
	end)
end

local function doFade(text)
	fade.Visible = true
	fadeText.Text = "🚇  " .. (text or "")
	local info = TweenInfo.new(0.5)
	TweenService:Create(fade, info, { BackgroundTransparency = 0 }):Play()
	TweenService:Create(fadeText, info, { TextTransparency = 0 }):Play()
	task.wait(1.4)
	TweenService:Create(fade, info, { BackgroundTransparency = 1 }):Play()
	TweenService:Create(fadeText, info, { TextTransparency = 1 }):Play()
	task.wait(0.5)
	fade.Visible = false
end

-- Actualización del HUD ------------------------------------------------------
local function bindMoney()
	local leaderstats = player:WaitForChild("leaderstats")
	local pesos = leaderstats:WaitForChild("Pesos")
	local function update()
		moneyLabel.Text = formatMoney(pesos.Value) .. " MXN"
	end
	pesos.Changed:Connect(update)
	update()
end

local function updateInfo()
	local t = Lighting.ClockTime
	local h = math.floor(t)
	local m = math.floor((t - h) * 60)
	local job = Config.GetJob(player:GetAttribute("Job") or "Ciudadano")
	infoLabel.Text = string.format("%02d:%02d · %s", h, m, job and job.Name or "")

	local now = workspace:GetServerTimeNow()
	local jailed = player:GetAttribute("JailedUntil")
	local wantedUntil = player:GetAttribute("WantedUntil")
	if jailed then
		statusLabel.Visible = true
		statusLabel.BackgroundColor3 = THEME.Orange
		statusLabel.Text = "RECLUSORIO: " .. math.max(0, math.ceil(jailed - now)) .. "s"
	elseif wantedUntil then
		local left = math.max(0, math.ceil(wantedUntil - now))
		statusLabel.Visible = true
		statusLabel.BackgroundColor3 = THEME.Red
		statusLabel.Text = string.format("¡SE BUSCA! %d:%02d", math.floor(left / 60), left % 60)
	else
		statusLabel.Visible = false
	end
end

-- API para otros módulos del cliente ----------------------------------------------
UI.Gui = gui
UI.Theme = THEME
UI.New = new
UI.Corner = corner
UI.Padding = padding
UI.Button = button
UI.FormatMoney = formatMoney
UI.OpenPanel = openPanel
UI.ClosePanel = closePanel
UI.AddRow = addRow
UI.Notify = notify
UI.IsPanelOpen = function()
	return panel.Visible
end

function UI.Init()
	gui.Parent = player:WaitForChild("PlayerGui")

	jobsButton.MouseButton1Click:Connect(function()
		if panel.Visible and panelTitle.Text == "Bolsa de trabajo CDMX" then
			closePanel()
		else
			showJobs()
		end
	end)
	UserInputService.InputBegan:Connect(function(input, processed)
		if processed then
			return
		end
		if input.KeyCode == Enum.KeyCode.J then
			if panel.Visible then
				closePanel()
			else
				showJobs()
			end
		end
	end)

	Remotes.Notify.OnClientEvent:Connect(notify)
	Remotes.OpenShop.OnClientEvent:Connect(showShop)
	Remotes.OpenMetro.OnClientEvent:Connect(showMetro)
	Remotes.Fade.OnClientEvent:Connect(doFade)

	task.spawn(bindMoney)
	task.spawn(function()
		while true do
			updateInfo()
			task.wait(0.5)
		end
	end)
end

return UI
