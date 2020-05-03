local DebugXL = require( game.ReplicatedStorage.TS.DebugXLTS ).DebugXL
DebugXL:logI( 'Executed', script.Name )

local Costumes          = require( game.ServerStorage.Standard.CostumesServer )

local CharacterI        = require( game.ServerStorage.CharacterI )
local Inventory         = require( game.ServerStorage.InventoryModule )

local PlayerServer = require( game.ServerStorage.TS.PlayerServer ).PlayerServer
local ToolCaches = require( game.ServerStorage.TS.ToolCaches ).ToolCaches

local PossessionData    = require( game.ReplicatedStorage.PossessionData )

local PlayerUtility = require( game.ReplicatedStorage.TS.PlayerUtility ).PlayerUtility
local ToolData = require( game.ReplicatedStorage.TS.ToolDataTS ).ToolData

local FlexEquip = {}


function FlexEquip:ApplyEntireCostumeWait( player, pcData, activeSkinsT )
	if( not PlayerUtility.IsPlayersCharacterAlive( player )) then return end

	local equippedItemModelsA = {}
	local noAttachmentsSet = {}
	pcData.gearPool:forEach( function( item, _ )
		if item.equippedB then
			local equipDatum = ToolData.dataT[ item.baseDataS ]
			if not item.hideItemB then
				local baseEquipS = activeSkinsT[ equipDatum.skinType ] and PossessionData.dataT[ activeSkinsT[ equipDatum.skinType ] ].baseEquipS or equipDatum.baseEquipS
				local baseEquipObj = game.ServerStorage.Equip[ baseEquipS ]
				table.insert( equippedItemModelsA, baseEquipObj )
			end
			if item.hideAccessoriesB then
				local equipSlot = equipDatum.equipSlot
				for _, attachName in pairs( Costumes.attachmentsForEquipSlotT[ equipSlot ] ) do
					noAttachmentsSet[ attachName ] = true
				end
			end
		end
	end )
	
	DebugXL:logD( 'CharacterModel', 'FlexEquipModule - Costumes:LoadCharacter for '..player.Name )
	Costumes:LoadCharacter( player, equippedItemModelsA, noAttachmentsSet, true, player.Character )
	DebugXL:logV( 'CharacterModel', 'FlexEquipModule - character loaded for '..player.Name )
	
	-- loading a character erases the backpack, so:
	local characterKey = PlayerServer.getCharacterKeyFromPlayer( player )
	ToolCaches.updateToolCache( characterKey, pcData )
end

function FlexEquip:ApplyEntireCostumeIfNecessaryWait( player )
	if player.Team == game.Teams.Heroes then
		local character = player.Character
		if character then
			if character.Parent then
				local skinOwnerS = "monster"
				if player.Team == game.Teams.Heroes then
					skinOwnerS = "hero"
				end
				local allActiveSkinsT = Inventory:GetActiveSkinsWait( player )
				local _activeSkinsT = allActiveSkinsT[ skinOwnerS ]
	
				local pcData = CharacterI:GetPCDataWait( player )
				FlexEquip:ApplyEntireCostumeWait( player, pcData, _activeSkinsT )
			end
		end
	end
end

return FlexEquip
