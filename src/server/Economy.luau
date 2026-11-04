-- Economy: dinero en pesos con guardado en DataStore.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local Economy = {}

local store
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Config.DATASTORE_NAME)
	end)
	if ok then
		store = result
	else
		warn("[CDMX] DataStore no disponible (activa 'Enable Studio Access to API Services'):", result)
	end
end

local loaded = {} -- [player] = true cuando sus datos ya cargaron

local function key(player)
	return "player_" .. player.UserId
end

local function getValue(player)
	local ls = player:FindFirstChild("leaderstats")
	return ls and ls:FindFirstChild("Pesos")
end

function Economy.Get(player)
	local v = getValue(player)
	return v and v.Value or 0
end

function Economy.Add(player, amount)
	local v = getValue(player)
	if v then
		v.Value = v.Value + math.floor(amount)
	end
end

-- Cobra si alcanza; devuelve true/false
function Economy.Charge(player, amount)
	local v = getValue(player)
	if v and v.Value >= amount then
		v.Value = v.Value - amount
		return true
	end
	return false
end

-- Transfiere hasta `amount` (lo que alcance) y devuelve lo transferido
function Economy.Transfer(from, to, amount)
	local fv, tv = getValue(from), getValue(to)
	if not fv or not tv then
		return 0
	end
	local paid = math.min(fv.Value, amount)
	fv.Value = fv.Value - paid
	tv.Value = tv.Value + paid
	return paid
end

local function save(player)
	if not store or not loaded[player] then
		return
	end
	local amount = Economy.Get(player)
	local ok, err = pcall(function()
		store:SetAsync(key(player), { Money = amount }, { player.UserId })
	end)
	if not ok then
		warn("[CDMX] No se pudo guardar a", player.Name, err)
	end
end

local function onPlayerAdded(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local pesos = Instance.new("IntValue")
	pesos.Name = "Pesos"
	pesos.Value = Config.STARTING_MONEY
	pesos.Parent = leaderstats
	leaderstats.Parent = player

	if store then
		local ok, data = pcall(function()
			return store:GetAsync(key(player))
		end)
		if ok then
			if type(data) == "table" and type(data.Money) == "number" then
				pesos.Value = data.Money
			end
			loaded[player] = true
		else
			-- Si falla la carga no guardamos, para no sobrescribir datos buenos
			warn("[CDMX] No se pudieron cargar los datos de", player.Name, data)
		end
	end
end

function Economy.Init()
	Players.PlayerAdded:Connect(onPlayerAdded)
	for _, p in ipairs(Players:GetPlayers()) do
		task.spawn(onPlayerAdded, p)
	end
	Players.PlayerRemoving:Connect(function(player)
		save(player)
		loaded[player] = nil
	end)
	game:BindToClose(function()
		for _, p in ipairs(Players:GetPlayers()) do
			save(p)
		end
	end)
	task.spawn(function()
		while true do
			task.wait(Config.AUTOSAVE_INTERVAL)
			for _, p in ipairs(Players:GetPlayers()) do
				task.spawn(save, p)
			end
		end
	end)
end

return Economy
