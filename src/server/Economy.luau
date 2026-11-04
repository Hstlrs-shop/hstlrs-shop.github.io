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

local loaded = {} -- [player] = true cuando sus datos cargaron bien (solo entonces se guardan)
local dataByPlayer = {} -- [player] = { Cars = {}, Story = {}, Title = nil }

local function defaultData()
	return {
		Cars = {}, -- { { Id = "Tsuro", Paint = 1 }, ... }
		Story = { Chapter = 1, Step = 1, Path = nil, Done = false },
		Title = nil,
	}
end

-- Datos del jugador (autos, historia...). Siempre devuelve una tabla.
function Economy.GetData(player)
	local d = dataByPlayer[player]
	if not d then
		d = defaultData()
		dataByPlayer[player] = d
	end
	return d
end

-- Espera a que terminen de cargar los datos del jugador (máx. 15 s)
function Economy.WaitForData(player)
	local t = 0
	while player.Parent and not (player:FindFirstChild("leaderstats") and player:GetAttribute("DataReady")) and t < 15 do
		t = t + task.wait(0.1)
	end
	return Economy.GetData(player)
end

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
	local d = Economy.GetData(player)
	local ok, err = pcall(function()
		store:SetAsync(key(player), { Money = amount, Cars = d.Cars, Story = d.Story, Title = d.Title }, { player.UserId })
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
			local d = Economy.GetData(player)
			if type(data) == "table" then
				if type(data.Money) == "number" then
					pesos.Value = data.Money
				end
				if type(data.Cars) == "table" then
					d.Cars = data.Cars
				end
				if type(data.Story) == "table" and type(data.Story.Chapter) == "number" then
					d.Story = data.Story
				end
				if type(data.Title) == "string" then
					d.Title = data.Title
					player:SetAttribute("Title", data.Title)
				end
			end
			loaded[player] = true
		else
			-- Si falla la carga no guardamos, para no sobrescribir datos buenos
			warn("[CDMX] No se pudieron cargar los datos de", player.Name, data)
		end
	end
	Economy.GetData(player)
	player:SetAttribute("DataReady", true)
end

function Economy.Init()
	Players.PlayerAdded:Connect(onPlayerAdded)
	for _, p in ipairs(Players:GetPlayers()) do
		task.spawn(onPlayerAdded, p)
	end
	Players.PlayerRemoving:Connect(function(player)
		save(player)
		loaded[player] = nil
		dataByPlayer[player] = nil
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
