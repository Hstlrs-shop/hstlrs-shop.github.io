-- DayNight: ciclo de día y noche; enciende el alumbrado público al anochecer.

local Lighting = game:GetService("Lighting")
local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local DayNight = {}

local function setLights(on)
	for _, lamp in ipairs(CollectionService:GetTagged("StreetLight")) do
		local light = lamp:FindFirstChildOfClass("PointLight")
		if light then
			light.Enabled = on
		end
		lamp.Material = on and Enum.Material.Neon or Enum.Material.SmoothPlastic
	end
end

function DayNight.Init()
	Lighting.ClockTime = 9
	-- Un toque de neblina/smog chilango
	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	atmosphere.Density = 0.32
	atmosphere.Haze = 1.6
	atmosphere.Color = Color3.fromRGB(215, 200, 180)
	atmosphere.Decay = Color3.fromRGB(150, 130, 110)
	atmosphere.Parent = Lighting

	local hoursPerSecond = 24 / (Config.DAY_LENGTH_MINUTES * 60)
	local lightsOn = nil
	RunService.Heartbeat:Connect(function(dt)
		Lighting.ClockTime = (Lighting.ClockTime + dt * hoursPerSecond) % 24
		local night = Lighting.ClockTime >= 18.3 or Lighting.ClockTime < 6.2
		if night ~= lightsOn then
			lightsOn = night
			setLights(night)
		end
	end)
end

return DayNight
