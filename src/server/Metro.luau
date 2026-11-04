-- Metro: viaja entre estaciones pagando el boleto.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Metro = {}

local ctx
local traveling = {}

local function nearStation(player)
	local char = player.Character
	local root = char and char:FindFirstChild("HumanoidRootPart")
	if not root then
		return nil
	end
	for i, st in ipairs(ctx.Map.Stations) do
		if (root.Position - st.Part.Position).Magnitude < 25 then
			return i
		end
	end
	return nil
end

local function onTravel(player, toIndex)
	if traveling[player] or type(toIndex) ~= "number" then
		return
	end
	local from = nearStation(player)
	local dest = ctx.Map.Stations[toIndex]
	if not from or not dest or from == toIndex then
		return
	end
	if player:GetAttribute("JailedUntil") then
		return
	end
	if not ctx.Economy.Charge(player, Config.METRO_FARE) then
		ctx.Notify(player, "Te falta para el boleto ($" .. Config.METRO_FARE .. ").", "bad")
		return
	end
	traveling[player] = true
	ctx.Remotes.Fade:FireClient(player, "Próxima estación: " .. dest.Name)
	task.wait(1.2)
	local char = player.Character
	if char then
		char:PivotTo(dest.Arrival)
	end
	traveling[player] = nil
end

function Metro.Init(context)
	ctx = context
	local names = {}
	for i, st in ipairs(ctx.Map.Stations) do
		names[i] = st.Name
		st.Prompt.Triggered:Connect(function(player)
			ctx.Remotes.OpenMetro:FireClient(player, i, names)
		end)
	end
	ctx.Remotes.MetroTravel.OnServerEvent:Connect(onTravel)
end

return Metro
