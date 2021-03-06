
// Copyright (c) Happion Laboratories - see license at https://github.com/JamieFristrom/dungeonlife/blob/master/LICENSE.md

import { LogLevel, DebugXL, LogArea } from 'ReplicatedStorage/TS/DebugXLTS'
DebugXL.logI(LogArea.Executed, script.Name)

import { Players, DataStoreService, HttpService, Workspace } from "@rbxts/services";

import { ToolCaches } from "ServerStorage/TS/ToolCaches"

import * as AnalyticsXL from "ServerStorage/Standard/AnalyticsXL"
import * as CheatUtility from "ReplicatedStorage/TS/CheatUtility"
import * as Heroes from "ServerStorage/Standard/HeroesModule"
import * as Inventory from "ServerStorage/Standard/InventoryModule"

import * as CharacterI from "ServerStorage/Standard/CharacterI"

import { CharacterClasses, CharacterClass } from "ReplicatedStorage/TS/CharacterClasses"
import { FlexTool, GearDefinition } from "ReplicatedStorage/TS/FlexToolTS"
import { GameplayTestUtility } from "ReplicatedStorage/TS/GameplayTestUtility"
import { Hero } from "ReplicatedStorage/TS/HeroTS"
import { ToolData } from "ReplicatedStorage/TS/ToolDataTS"

import { Analytics } from "./Analytics"
import { GameplayTestService } from "./GameplayTestService"
import { MessageServer } from "./MessageServer"
import { MobServer } from "./MobServer"
import { PlayerServer } from "./PlayerServer"
import { SkinUtility } from "./SkinUtility"
import { GameServer } from "./GameServer"
import { MainContext } from "./MainContext"

class AdminCommandsC {
  banListStore = DataStoreService.GetOrderedDataStore("BanList")

  luaCommandHandlerFunc: (player: Player, args: string[]) => void = function () { warn("Lua Command Handler Not Set") }

  setLuaCommandHandler(newFunc: (player: Player, args: string[]) => void) {
    this.luaCommandHandlerFunc = newFunc
  }

  isBanned(player: Player) {
    let banListStore = this.banListStore
    let banEntry = undefined
    let [result, err] = pcall(function () {
      banEntry = banListStore.GetAsync(tostring(player.UserId))
    })
    if (!result) {
      AnalyticsXL.ReportEvent(player, "PlaceId-" + game.PlaceId, "isBanned GetAsync fail: " + err, "", 1, true)
    }
    return banEntry !== undefined
  }
}

export let AdminCommands = new AdminCommandsC()

let CommandList: { [k: string]: unknown } =
{
  ban: function (sender: Player, args: string[]) {
    // takes user id
    DebugXL.Assert(args[0] === "ban")
    let bannedPlayerId = args[1]  // not 0, that's the function name redundant, should be ban
    AdminCommands.banListStore.SetAsync(bannedPlayerId, tonumber(bannedPlayerId))
    warn(bannedPlayerId + " banned")
    AnalyticsXL.ReportEvent(sender, "Ban", bannedPlayerId, sender.Name, 0, true)
  },

  // for cut and paste -
  // !equip {"baseDataS":"DaggersDual","levelN":1}
  // !equip {"baseDataS":"DaggersDual","levelN":1}
  // !equip {"baseDataS":"Shortsword","levelN":1,"enhancementsA":[{"flavorS":"cold","levelN":2}]}
  // !equip {"baseDataS":"Shortsword","levelN":1,"enhancementsA":[{"flavorS":"fire","levelN":2}]}
  // !equip {"baseDataS":"Shortsword","levelN":1,"enhancementsA":[{"flavorS":"explosive","levelN":2}]}
  // !equip {"baseDataS":"MagicHealing","levelN":2}
  // !equip {"baseDataS":"Bomb","levelN":2}
  // !equip {"baseDataS":"MagicBarrier","levelN":2}
  // !equip {"baseDataS":"Longbow","levelN":1,"enhancementsA":[{"flavorS":"explosive","levelN":2}]}
  // !equip {"baseDataS":"Mana","levelN":1}
  equip: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      print("Equipping " + sender.Name + " with " + args[1])
      DebugXL.Assert(args[0] === "equip")
      let myPC = CharacterI.GetPCDataWait(sender)

      let gearDef = HttpService.JSONDecode(args[1]) as GearDefinition
      if (gearDef) {
        if (!ToolData.dataT[gearDef.baseDataS]) {
          print(gearDef.baseDataS + " doesn't exist")
        }
        else {
          let flexTool = new FlexTool(
            gearDef.baseDataS,
            gearDef.levelN ? gearDef.levelN : 1,
            gearDef.enhancementsA ? gearDef.enhancementsA : [])
          myPC.giveFlexTool(flexTool)
          if (myPC.gearPool.size() < 4) {
            flexTool.slotN = myPC.gearPool.size() + 1
          }
          const characterKey = PlayerServer.getCharacterKeyFromPlayer(sender)
          const characterRecord = PlayerServer.getCharacterRecord(characterKey)
          ToolCaches.updateToolCache(PlayerServer.getPlayerTracker(), characterKey, myPC, SkinUtility.getCurrentSkinset(Inventory, sender, characterRecord));
          (Workspace.WaitForChild("Signals").WaitForChild("HotbarRE") as RemoteEvent).FireClient(sender, "Refresh", myPC)
        }
      }
      else {
        print("Unable to decode")
      }
    }
  },

  getTestGroups: function (sender: Player, args: string[]) {
    let inventory = Inventory.GetWait(sender)
    let testGroups = GameplayTestUtility.getTestGroups(inventory)
    if (testGroups) {
      testGroups.forEach(element => {
        print(sender.Name + " is in test group " + element[0] + ":" + element[1])
      });
    }
    let serverTestGroups = GameplayTestService.getServerTestGroups()!
    for (let [name, group] of serverTestGroups.entries()) {
      print("Server test group " + name + ":" + group)
    }
  },

  gold: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      DebugXL.Assert(args[0] === "gold")
      Heroes.AdjustGold(sender, tonumber(args[1])!, "Cheat", "Cheat")
    }
  },

  get: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      DebugXL.Assert(args[0] === "get")
      Inventory.AdjustCount(sender, args[1], 1, "Cheat", "Cheat")
    }
  },

  hurt: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      let humanoid = sender.Character!.FindFirstChild('Humanoid') as Humanoid
      if (humanoid) {
        let amount = tonumber(args[1])
        amount = amount ? amount : 10
        humanoid.Health = humanoid.Health - amount
      }
    }
  },

  kick: function (sender: Player, args: string[]) {
    DebugXL.Assert(args[0] === "kick")
    let kickedPlayer = Players.GetPlayers().find((p) => p.Name === args[1])
    if (kickedPlayer) {
      kickedPlayer.Kick()
      warn(kickedPlayer.Name + " kicked")
      AnalyticsXL.ReportEvent(sender, "Kick", kickedPlayer.Name, sender.Name, 0, true)
    }
  },

  kill: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      let humanoid = sender.Character!.FindFirstChild('Humanoid') as Humanoid
      if (humanoid)
        humanoid.Health = 0
    }
  },

  potions: function (sender: Player, args: string[]) {
    if (CheatUtility.PlayerWhitelisted(sender)) {
      let humanoid = sender.Character!.FindFirstChild('Humanoid') as Humanoid
      if (humanoid) {
        const heroRecord = PlayerServer.getCharacterRecordFromPlayer(sender)
        if (heroRecord instanceof Hero) {
          let healths = tonumber(args[1])
          healths = healths ? healths : 1
          for (let i = 0; i < healths; i++) {
            let potionInstance = new FlexTool("Healing", 0, [])
            Heroes.RecordTool(MainContext.get(), sender, heroRecord, potionInstance)
          }
          let manas = tonumber(args[2])
          manas = manas ? manas : 0
          for (let i = 0; i < manas; i++) {
            let potionInstance = new FlexTool("Mana", 0, [])
            Heroes.RecordTool(MainContext.get(), sender, heroRecord, potionInstance)
          }
        }
      }
    }
  },

  print: function (sender: Player, args: string[]) { print(args) },

  resetanalytics: function (sender: Player) {
    let analyticsDataStore = DataStoreService.GetDataStore("Analytics")
    let [success, err] = pcall(() => {
      analyticsDataStore.RemoveAsync("user_" + sender.UserId)
    })
    if (success)
      print("Reset analytics")
    else
      print("Failure: " + err)
  },

  // setLogLevel level optionaltag
  setLogLevel: function (sender: Player, args: string[]) {
    const logLevelString = args[1]
    if (!logLevelString) {
      DebugXL.logW(LogArea.Admin, 'Missing log level')
      return
    }
    if (!(logLevelString in LogLevel)) {
      DebugXL.logW(LogArea.Admin, 'Unknown log level ' + args[1])
      return
    }
    const logLevel = LogLevel[logLevelString as keyof typeof LogLevel]
    const logAreaString = args[2]
    if (logAreaString) {
      const logArea = LogArea[logAreaString as keyof typeof LogArea]
      if (!(logArea in LogArea)) {
        DebugXL.logW(LogArea.Admin, 'Unknown log area ' + args[2])
        return
      }
      DebugXL.setLogLevel(logLevel, logArea)
    }
    else {
      DebugXL.setLogLevel(logLevel)
    }
  },

  setMobPush: function (sender: Player, args: string[]) {
    let mobPush = tonumber(args[1])
    if (!mobPush) {
      DebugXL.logW(LogArea.Admin, 'mobPush requires number parameter')
    }
    else {
      MobServer.setMobPush(mobPush)
    }
  },

  setServerTestGroup: function (sender: Player, args: string[]) {
    let newGroupNum = tonumber(args[2])
    newGroupNum = newGroupNum ? newGroupNum : 1
    GameplayTestService.setServerTestGroup(args[1], newGroupNum)
  },

  setTestGroup: function (sender: Player, args: string[]) {
    let inventory = Inventory.GetWait(sender)
    if (inventory.testGroups.has(args[1])) {
      let newGroupNum = tonumber(args[2])
      newGroupNum = newGroupNum ? newGroupNum : 1
      inventory.testGroups.set(args[1], newGroupNum)
    }
    else {
      warn("Test group " + args[1] + " doesn't exist for player")
    }
  },

  spawnMob: function (sender: Player, args: string[]) {
    const characterClass = tostring(args[1]) || 'Orc'
    if (!CharacterClasses.monsterStats[characterClass]) {
      DebugXL.logW(LogArea.Admin, 'No character class ' + characterClass)
    }
    else {
      const x = tonumber(args[2])
      const z = tonumber(args[3])
      const position = x && z ? new Vector3(x, 0, z) : undefined
      MobServer.spawnMob(
        MainContext.get(),
        characterClass as CharacterClass,
        GameServer.getSuperbossManager(),
        1,
        position) // "1" currently only affects superbosses
    }
  },

  stressanalytics: function (sender: Player, args: string[]) {
    let numFrames = tonumber(args[1]) || 1
    let requestsPerFrame = tonumber(args[2]) || 1
    for (let i = 0; i < numFrames; i++) {
      print("Stress testing http " + requestsPerFrame + " requests per frame. Frame " + i)
      for (let j = 0; j < requestsPerFrame; j++) {
        Analytics.ReportEvent(sender, "stresstest", "a", "b", i * requestsPerFrame + j)
      }
      wait(0.034)
    }
  },

  testmessage: function (sender: Player, args: string[]) {
    let messageKey = args[1]
    MessageServer.PostMessageByKey(sender, messageKey, false, 0.0001, true)
  },
}

function playerAdded(player: Player) {
  // kind of want this at a lower rank than full on cheats so I could deputize mods, but rn there's not enough
  // work for mods to do anyway, so I'll just use the cheat whitelist here for now
  if (CheatUtility.PlayerWhitelisted(player)) {
    player.Chatted.Connect( (message, recipientI) => {
      print("Chatted " + player.Name)
      let recipient = recipientI as Player
      if (!recipient) {
        if (message.sub(0, 0) === '!') {
          let args = message.sub(1).split(" ")
          // a roblox-ts bug/quirk where it was including a this/self parameter with the functions but not invoking with one led us here:
          let dispatchFunc = CommandList[args[0]] as (_: unknown, sender: Player, args: string[]) => void
          if (dispatchFunc) {
            print("Admin command from " + player.Name + ": " + args[0])
            dispatchFunc(undefined, player, args)
          }
          else {
            AdminCommands.luaCommandHandlerFunc(player, args)
          }
        }
      }
    })
  }

  spawn(function () {
    for (; ;) {
      if (AdminCommands.isBanned(player)) {
        player.Kick("Cheating")
        return
      }
      wait(240)
    }
  })
}

Players.PlayerAdded.Connect(function (player: Player) {
  playerAdded(player)
})

Players.GetPlayers().forEach(function (player) {
  playerAdded(player)
})
