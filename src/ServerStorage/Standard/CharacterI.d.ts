
// Copyright (c) Happion Laboratories - see license at https://github.com/JamieFristrom/dungeonlife/blob/master/LICENSE.md

import { CharacterRecordI } from "ReplicatedStorage/TS/CharacterRecord"
import { FlexTool } from "ReplicatedStorage/TS/FlexToolTS";
import { ServerContextI } from "ServerStorage/TS/ServerContext";


declare interface DamageTags {
    spell?: boolean
    ranged?: boolean
    close?: boolean
}

type Character = Model

declare class CharacterIClass {
    SetCharacterClass(player: Player, characterClass: string): void
    DetermineFlexToolDamage(player: Player, flexTool: FlexTool): [number, boolean]
    TakeDirectDamage(hitCharacter: Model, damage: number, attackingPlayer: Player, damageTagsT: DamageTags): void
    TakeFlexToolDamage(context: ServerContextI, hitCharacter: Model, attackingCharacter: Character, flexTool: FlexTool, tool?: Tool): void
    //    TakeToolDamage( hitCharacter: Model, tool: Tool ): void
    GetPCDataWait(player: Player): CharacterRecordI
}

declare let CharacterI: CharacterIClass

export = CharacterI