-- Driving: manejo arcade de los autos de la CDMX.
-- El servidor da la propiedad de red al conductor, así que aquí movemos el auto.

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer

local Driving = {}

local ACCEL = 28
local BRAKE = 45
local TURN_RATE = math.rad(95) -- grados por segundo a velocidad completa

local function approach(current, target, delta)
	if current < target then
		return math.min(current + delta, target)
	end
	return math.max(current - delta, target)
end

local function drive(humanoid, seat)
	local speed = 0
	local conn
	conn = RunService.Heartbeat:Connect(function(dt)
		if humanoid.SeatPart ~= seat or not seat.Parent then
			conn:Disconnect()
			return
		end
		local base = seat.Parent and seat.Parent.PrimaryPart
		if not base or base.Anchored then
			return
		end
		local maxSpeed = seat:GetAttribute("CarMaxSpeed") or 60
		local throttle = seat.ThrottleFloat
		local steer = seat.SteerFloat

		local target = throttle * maxSpeed
		if throttle < 0 then
			target = throttle * maxSpeed * 0.4 -- reversa más lenta
		end
		local rate = (throttle == 0 or (target * speed) < 0) and BRAKE or ACCEL
		speed = approach(speed, target, rate * dt)

		local cf = base.CFrame
		local look = Vector3.new(cf.LookVector.X, 0, cf.LookVector.Z)
		if look.Magnitude < 0.1 then
			return
		end
		look = look.Unit

		-- Si se volteó, lo enderezamos
		if cf.UpVector.Y < 0.6 then
			base.CFrame = CFrame.lookAt(cf.Position + Vector3.new(0, 3, 0), cf.Position + Vector3.new(0, 3, 0) + look)
			speed = 0
		end

		local vel = base.AssemblyLinearVelocity
		base.AssemblyLinearVelocity = Vector3.new(look.X * speed, math.min(vel.Y, 20), look.Z * speed)

		local grip = math.clamp(math.abs(speed) / 15, 0, 1)
		local dir = speed >= 0 and 1 or -1
		base.AssemblyAngularVelocity = Vector3.new(0, -steer * TURN_RATE * grip * dir, 0)
	end)
end

local function onCharacter(char)
	local humanoid = char:WaitForChild("Humanoid")
	humanoid.Seated:Connect(function(active, seat)
		if active and seat and seat:IsA("VehicleSeat") and seat:GetAttribute("CDMXCar") then
			drive(humanoid, seat)
		end
	end)
end

function Driving.Init()
	if player.Character then
		task.spawn(onCharacter, player.Character)
	end
	player.CharacterAdded:Connect(onCharacter)
end

return Driving
