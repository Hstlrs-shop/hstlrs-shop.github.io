-- CDMX Roleplay - punto de entrada del servidor.
-- Construye la ciudad y arranca todos los sistemas.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Shared.Config)
local MapBuilder = require(script.MapBuilder)
local Economy = require(script.Economy)
local Jobs = require(script.Jobs)
local Crime = require(script.Crime)
local Shops = require(script.Shops)
local Metro = require(script.Metro)
local Vehicles = require(script.Vehicles)
local DayNight = require(script.DayNight)
local Combat = require(script.Combat)
local Missions = require(script.Missions)

-- Remotes ----------------------------------------------------------------
local remotesFolder = Instance.new("Folder")
remotesFolder.Name = "Remotes"
local Remotes = {}
for _, name in ipairs({
	"Notify", "ChangeJob", "OpenShop", "BuyItem", "OpenMetro", "MetroTravel", "Fade",
	-- autos
	"OpenDealership", "BuyCar", "SpawnOwnedCar", "GarageUpdate", "Waypoint",
	-- armas
	"Shoot", "Reload", "ShotFx", "OpenWeaponShop", "BuyWeapon",
	-- historia y misiones
	"Objective", "Dialog", "DialogDone", "Sync",
}) do
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = remotesFolder
	Remotes[name] = r
end
remotesFolder.Parent = ReplicatedStorage

local function Notify(player, text, kind)
	Remotes.Notify:FireClient(player, text, kind or "info")
end

local function NotifyJob(jobId, text, kind)
	for _, p in ipairs(Players:GetPlayers()) do
		if p:GetAttribute("Job") == jobId then
			Notify(p, text, kind)
		end
	end
end

-- Mundo ------------------------------------------------------------------
local t0 = os.clock()
local map = MapBuilder.Build()
print(string.format("[CDMX] Ciudad construida en %.2fs", os.clock() - t0))

-- Sistemas -----------------------------------------------------------------
local ctx = {
	Remotes = Remotes,
	Economy = Economy,
	Notify = Notify,
	NotifyJob = NotifyJob,
	Map = map,
}
ctx.Crime = Crime
ctx.Jobs = Jobs
ctx.Combat = Combat
ctx.Missions = Missions
ctx.Vehicles = Vehicles

Economy.Init()
Jobs.Init(ctx)
Crime.Init(ctx)
Shops.Init(ctx)
Metro.Init(ctx)
Vehicles.Init(ctx)
Combat.Init(ctx)
Missions.Init(ctx)
DayNight.Init()

Players.PlayerAdded:Connect(function(player)
	task.wait(3)
	if player.Parent then
		Notify(player, "¡Bienvenido a " .. Config.GAME_NAME .. "! Presiona [J] o el botón TRABAJOS para elegir chamba.", "good")
	end
end)

print("[CDMX] Servidor listo. ¡Órale!")
