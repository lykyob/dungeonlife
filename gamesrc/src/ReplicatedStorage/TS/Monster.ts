
// Copyright (c) Happion Laboratories - see license at https://github.com/JamieFristrom/dungeonlife/blob/master/LICENSE.md

import { DebugXL, LogArea } from "ReplicatedStorage/TS/DebugXLTS";
DebugXL.logI(LogArea.Executed, script.Name)

import { CharacterClass } from "./CharacterClasses"
import { CharacterRecord } from "./CharacterRecord"
import { FlexTool } from 'ReplicatedStorage/TS/FlexToolTS'
import { Teams } from "@rbxts/services";

export class Monster extends CharacterRecord {
    constructor(
        id: CharacterClass,
        items: FlexTool[],
        public monsterLevel: number) {
        super(id, items)
    }

    static convertFromRemote(rawData: Monster) {
        CharacterRecord.convertFromRemote(rawData)
        let monster = setmetatable(rawData, Monster as LuaMetatable<Monster>) as Monster
        return monster
    }

    getTeam() {
        return (Teams.FindFirstChild("Monsters") as Team | undefined)!
    }

    getLocalLevel() { return this.monsterLevel }
    getActualLevel() { return this.monsterLevel }
}

