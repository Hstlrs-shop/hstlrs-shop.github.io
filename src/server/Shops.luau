-- Shops: taquerías, puestos y tienditas. La comida se come y cura vida.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Shops = {}

local ctx -- { Remotes, Economy, Notify, Map }
local MAX_DISTANCE = 20
local COMMISSION_RANGE = 80

local function makeFood(item)
	local tool = Instance.new("Tool")
	tool.Name = item.Name
	tool.ToolTip = "Haz clic para comer (+" .. item.Heal .. " vida)"
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(1, 0.6, 1)
	handle.Color = BrickColor.new(item.Color).Color
	handle.Material = Enum.Material.SmoothPlastic
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = tool
	local eaten = false
	tool.Activated:Connect(function()
		if eaten then
			return
		end
		local hum = tool.Parent and tool.Parent:FindFirstChildOfClass("Humanoid")
		if hum and hum.Health > 0 then
			eaten = true
			hum.Health = math.min(hum.MaxHealth, hum.Health + item.Heal)
			tool:Destroy()
		end
	end)
	return tool
end

-- Paga comisión al trabajador de ese giro más cercano al local
local function payCommission(shop, buyer, shopPart)
	local jobId = Config.Shops[shop.ShopId].CommissionJob
	if not jobId then
		return
	end
	local best, bestDist = nil, COMMISSION_RANGE
	for _, p in ipairs(Players:GetPlayers()) do
		if p ~= buyer and p:GetAttribute("Job") == jobId and p.Character then
			local root = p.Character:FindFirstChild("HumanoidRootPart")
			if root then
				local d = (root.Position - shopPart.Position).Magnitude
				if d < bestDist then
					best, bestDist = p, d
				end
			end
		end
	end
	if best then
		ctx.Economy.Add(best, Config.SALE_COMMISSION)
		ctx.Notify(best, "Vendiste a " .. buyer.DisplayName .. " (+$" .. Config.SALE_COMMISSION .. " de comisión)", "money")
	end
end

local function onBuy(player, shopIndex, itemId)
	if type(shopIndex) ~= "number" or type(itemId) ~= "string" then
		return
	end
	local shop = ctx.Map.Shops[shopIndex]
	if not shop then
		return
	end
	local item = Config.GetItem(shop.ShopId, itemId)
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not item or not root then
		return
	end
	if (root.Position - shop.Part.Position).Magnitude > MAX_DISTANCE then
		ctx.Notify(player, "Acércate al mostrador para comprar.", "info")
		return
	end
	if not ctx.Economy.Charge(player, item.Price) then
		ctx.Notify(player, "No te alcanza, joven. Cuesta $" .. item.Price, "bad")
		return
	end
	makeFood(item).Parent = player.Backpack
	ctx.Notify(player, "Compraste " .. item.Name .. " (-$" .. item.Price .. ")", "good")
	payCommission(shop, player, shop.Part)
end

function Shops.Init(context)
	ctx = context
	for index, shop in ipairs(ctx.Map.Shops) do
		shop.Prompt.Triggered:Connect(function(player)
			ctx.Remotes.OpenShop:FireClient(player, index, shop.ShopId)
		end)
	end
	ctx.Remotes.BuyItem.OnServerEvent:Connect(onBuy)
end

return Shops
