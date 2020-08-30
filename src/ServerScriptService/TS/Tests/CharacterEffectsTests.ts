
// Copyright (c) Happion Laboratories - see license at https://github.com/JamieFristrom/dungeonlife/blob/master/LICENSE.md

import { LogLevel, DebugXL, LogArea } from 'ReplicatedStorage/TS/DebugXLTS'
DebugXL.logI(LogArea.Executed, script.Name)

import CharacterXL from "ServerStorage/Standard/CharacterXL";
import { TestContext, TestUtility } from "ServerStorage/TS/TestUtility";
import { Teams } from '@rbxts/services';

// test damage/time on monster character
{
    // arrange
    let testContext = new TestContext()
    testContext.getPlayer().Team = Teams.FindFirstChild("Heroes")
    let pc = testContext.makeTestPlayerCharacter("Warrior")   // need to do this or it'll lose track of team when switching from player to charater and back
    let testMonster = TestUtility.createTestCharacter()
    let oldHealth = testMonster.FindFirstChild<Humanoid>("Humanoid")!.Health

    // act
    CharacterXL.DamageOverTimeFor(testMonster, 2.5, 5, testContext.getPlayer())
    CharacterXL.ProcessCharacter(testContext, testMonster, 0.1)

    // assert
    TestUtility.assertTrue(testMonster.FindFirstChild<Humanoid>("Humanoid")!.Health < oldHealth, "Took damage over time")

    // clean
    testContext.clean()
}