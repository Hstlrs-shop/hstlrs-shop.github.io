-- CDMX Roleplay - punto de entrada del cliente.

local UI = require(script.UI)
local Driving = require(script.Driving)
local Gameplay = require(script.Gameplay)
local WeaponsClient = require(script.WeaponsClient)

UI.Init()
Driving.Init()
Gameplay.Init(UI)
WeaponsClient.Init(UI)
