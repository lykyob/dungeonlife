
// Copyright (c) Happion Laboratories - see license at https://github.com/JamieFristrom/dungeonlife/blob/master/LICENSE.md

import { DebugXL, LogArea } from 'ReplicatedStorage/TS/DebugXLTS'
DebugXL.logI(LogArea.Executed, script.GetFullName())

import { ContextActionService, Workspace, Players, RunService, Teams } from "@rbxts/services";

import * as FlexEquipUtility from "ReplicatedStorage/Standard/FlexEquipUtility"

import * as CharacterClientI from "ReplicatedStorage/Standard/CharacterClientI"

import * as InventoryClient from "ReplicatedStorage/Standard/InventoryClientStd"

import { HotbarSlot } from "ReplicatedStorage/TS/FlexToolTS"
import { FlexToolClient } from "ReplicatedStorage/TS/FlexToolClient"

import { CharacterRecord, CharacterRecordI } from "ReplicatedStorage/TS/CharacterRecord"

import { Localize } from "ReplicatedStorage/TS/Localize"
import { PCClient } from "ReplicatedStorage/TS/PCClient"

let hotbar = script.Parent!.Parent!.WaitForChild("Hotbar")

let hotbarRE = Workspace.WaitForChild('Signals')!.WaitForChild('HotbarRE') as RemoteEvent

let localPlayer = Players.LocalPlayer!
let playerGui = localPlayer.WaitForChild('PlayerGui')

// use 0 for none
function SelectSlot(slotN: number) {
    for (let i = 1; i <= HotbarSlot.Max; i++) {
        let inst = hotbar.FindFirstChild("Item" + i) as Frame
        let border = inst.WaitForChild('SelectedBorder') as ImageLabel
        border.Visible = i === slotN
    }
}


function WhatSlotCurrentlyEquipped() {
    let character = localPlayer.Character
    if (character) {
        let heldTool = character.FindFirstChildWhichIsA("Tool") as Tool
        if (heldTool) {
            let inventorySlotValueObj = (heldTool.FindFirstChild("PossessionKey") as StringValue|undefined)
            if (inventorySlotValueObj) {
                let possessionKey = inventorySlotValueObj.Value
                if (PCClient.pc) {
                    let slot = PCClient.pc.getSlotFromPossessionKey(possessionKey)
                    if (slot) return slot
                }
            }
        }
    }
    return 0
}


function Equip(slotN: HotbarSlot) {
    //print( "Equip "..slotN )
    DebugXL.Assert(PCClient.pc !== undefined)
    if (PCClient.pc) {
        let possessionKey = PCClient.pc.getPossessionKeyFromSlot(slotN)!
        if (possessionKey) {
            let localCharacter = localPlayer.Character
            if (localCharacter) {
                hotbarRE.FireServer("Equip", slotN)

                // get tool for hotbar slot
                let flexToolInst = PCClient.pc.getFlexTool(possessionKey)
                if (flexToolInst)  // possible you've thrown out the tool and the hotbar is late on updating
                {
                    if (flexToolInst.getUseType() === "power") {
                        let uiClick = playerGui.WaitForChild("Audio").WaitForChild("PowerActivate") as Sound
                        uiClick.Play()

                        // play effect now?
                        if (flexToolInst.canLogicallyActivate(localCharacter)) {
                            let manaValueObj = (localCharacter.FindFirstChild("ManaValue") as NumberValue|undefined)
                            if (manaValueObj) {
                                let mana = manaValueObj.Value
                                if (mana >= flexToolInst.getManaCost()) {
                                    if (flexToolInst.powerCooldownPctRemaining(localPlayer) <= 0) {
                                        flexToolInst.startPowerCooldown(localPlayer)
                                    }
                                }
                            }
                        }
                    }
                    else {
                        let uiClick = playerGui.WaitForChild('Audio').WaitForChild('UIClick') as Sound
                        uiClick.Play()
                        if (!localCharacter.Parent) {
                            // if we're on the character outfitting screen our tools won't have been instantiated
                            return
                        }

                        let humanoid = localCharacter.FindFirstChild("Humanoid") as Humanoid
                        if (humanoid) {
                            let heldTool = localCharacter.FindFirstChildWhichIsA("Tool") as Tool
                            if (heldTool && CharacterRecord.getToolPossessionKey(heldTool) === possessionKey) {
                                // unequip
                                DebugXL.logD(LogArea.Items, 'Unequipping from hotbar')
                                humanoid.UnequipTools()
                                //SelectSlot(0)
                            }
                            else {
                                let tool = CharacterRecord.getToolInstanceFromPossessionKey(localCharacter, PCClient.pc, possessionKey) as Tool
                                if (tool) {
                                    DebugXL.logD(LogArea.Items, 'Equipping from hotbar')
                                    humanoid.EquipTool(tool)  // error in EquipTool's type signature that has now been fixed
                                }
                                else {
                                    // there may be some false positives here, but most of the time this means your backpack is improperly cacheing...                                                        
                                    // I could see false positives coming from equipping a weapon that the inventory replication
                                    // says you have before the instance actually gets replicated - perhaps waiting here is the right choice
                                    const flexTool = PCClient.pc.getFlexTool(possessionKey)
                                    if (flexTool) {
                                        DebugXL.logW(LogArea.Items, "Hotbar failed to find instance for " + localCharacter.GetFullName() + " tool " + flexTool.baseDataS)
                                    }
                                    else {
                                        DebugXL.Error("Hotbar had possession key for " + localCharacter.GetFullName() + " flextool that doesn't exist")
                                    }
                                }
                                // put box around equipped tool in GUI
                                //SelectSlot( slotN )
                            }
                        }
                    }
                }
            }
        }
    }
}

for (let i: HotbarSlot = 1; i <= HotbarSlot.Max; i++) {
    let hotbarItem = hotbar.WaitForChild("Item" + i)
    let hotbarButton = hotbarItem.WaitForChild('Button') as TextButton
    let slot = i  // otherwise upvalue confused
    hotbarButton.MouseButton1Click.Connect(function () {
        if (PCClient.pc) {
            let itemDatum = CharacterClientI.GetPossessionFromSlot(PCClient.pc, slot)
            if (itemDatum) {
                Equip(slot)
            }
        }
        else {
            DebugXL.Error("Hotbar available for nonexistent pc")
        }
    })
}


function HotbarRefresh(pc: CharacterRecordI) {
    print("Refreshing hotbar")
    let allActiveSkins = InventoryClient.inventory.activeSkinsT
    let activeSkinsT = localPlayer.Team === Teams.WaitForChild('Heroes') ? allActiveSkins.hero : allActiveSkins.monster
    for (let i = 1; i <= HotbarSlot.Max; i++) {
        let itemDatum = CharacterClientI.GetPossessionFromSlot(pc, i)
        let newItem = hotbar.WaitForChild("Item" + i) as Frame
        if (itemDatum) {
            let title = newItem.WaitForChild('Title') as TextLabel
            title.Text = FlexToolClient.getShortName(itemDatum)
            title.Visible = true
            let level = newItem.WaitForChild('Level') as TextLabel
            level.Text = Localize.formatByKey("Lvl", [math.floor(itemDatum.getActualLevel())])
            level.Visible = true
            let hotkey = newItem.WaitForChild('Hotkey') as TextLabel
            hotkey.Text = tostring(i)
            let background = newItem.WaitForChild('Background') as ImageLabel
            background.ImageColor3 = FlexEquipUtility.GetRarityColor3(itemDatum)
            background.Visible = true
            let imageLabel = newItem.WaitForChild('ImageLabel') as ImageLabel
            imageLabel.Image = FlexEquipUtility.GetImageId(itemDatum, activeSkinsT)
            imageLabel.Visible = true

            newItem.Visible = true
        }
        else {
            newItem.Visible = false
        }
    }
}


PCClient.pcUpdatedConnect(HotbarRefresh)

//-- in case skins change this lets us update icons
InventoryClient.InventoryUpdatedConnect(() => {
    if (PCClient.pc)
        HotbarRefresh(PCClient.pc)
})

print("Hotbar Inventory connected")


let equipKeyCodes =
    [
        [Enum.KeyCode.DPadUp, Enum.KeyCode.One, Enum.KeyCode.KeypadOne],
        [Enum.KeyCode.DPadRight, Enum.KeyCode.Two, Enum.KeyCode.KeypadTwo],
        [Enum.KeyCode.DPadDown, Enum.KeyCode.Three, Enum.KeyCode.KeypadThree],
        [Enum.KeyCode.DPadLeft, Enum.KeyCode.Four, Enum.KeyCode.KeypadFour],
    ]

// I believe it is fine that this is called every time your character is reset, because new action binds overwrite the old.
for (let i = 0; i < HotbarSlot.Max; i++) {
    let slot = i + 1  // necessary to put this in a variable because i will be incremented outside of the closure
    //     ContextActionService.BindAction( "equip"+i, 
    //         ( actionName: string, inputState: Enum.UserInputState ) => { if( inputState === Enum.UserInputState.Begin ) Equip(slot) },
    //         false, ...equipKeyCodes[i-1] )
    // }
    ContextActionService.BindActionAtPriority("equip" + i, (actionName: string, inputState: Enum.UserInputState) => {
        if (inputState === Enum.UserInputState.Begin) Equip(slot)
    },
        false, 3000, ...equipKeyCodes[i])
}

RunService.RenderStepped.Connect(function () {
    if (PCClient.pc) {
        for (let i: HotbarSlot = 1; i <= HotbarSlot.Max; i++) {
            // get tool for hotbar slot
            let hotbarItem = hotbar.WaitForChild("Item" + i) as Frame
            if (hotbarItem.Visible) {
                let cooldownCover = hotbarItem.WaitForChild('CooldownCover') as ImageLabel
                cooldownCover.Visible = true
                let cooldownReadout = hotbarItem.WaitForChild('CooldownReadout') as TextLabel
                let possessionKey = PCClient.pc.getPossessionKeyFromSlot(i)
                let cooldownPct = 0
                let cooldownSecs = 0
                if (possessionKey) {
                    let flexToolInst = PCClient.pc.getFlexTool(possessionKey)
                    if (flexToolInst)  // possible you've thrown out the tool and the hotbar is late on updating
                    {
                        if (flexToolInst.getUseType() === "power") {
                            cooldownPct = flexToolInst.powerCooldownPctRemaining(localPlayer)
                            cooldownSecs = flexToolInst.powerCooldownTimeRemaining(localPlayer)
                        }
                    }
                }
                cooldownCover.Size = new UDim2(1, 0, cooldownPct, 0)
                //cooldown
                cooldownReadout.Text = cooldownSecs > 0 ? math.ceil(cooldownSecs) + " s" : ""
            }
        }
        SelectSlot(WhatSlotCurrentlyEquipped())
    }
})


