// jshint esversion: 6
// Copyright 2017 Uche Akotaobi.
//
// This file is part of BOT.
//
// BOT is free software: you can redistribute it and/or modify it under the
// terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.
//
// BOT is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more
// details.
//
// You should have received a copy of the GNU General Public License along
// with BOT.  If not, see <http://www.gnu.org/licenses/>.

////////////////////////////////////////////////////////////////////////////////
// The AiPlayer is really a set of disjointed routines to select and populate //
// game controls and to perform attacks that have a chance of being really    //
// annoying for a human opponent.                                             //
////////////////////////////////////////////////////////////////////////////////

function AiPlayer(factionName, controller, view) {
    "use strict";

    // -----------------------------------------------------------------------
    // Public member functions (per-instance functions.)

    // Find the most effective attack (that is, a weapon name/enemy pair) for
    // an arbitrary robot at this point in time.
    //
    // Returns an object with the following fields:
    // - weaponName: The name of the weapon that this robot should attack
    //               with.
    // - enemy:      The enemy robot that should be attacked.
    // - reasons:    The AI's reasons for selecting this pair.  An
    //               array of human-readable strings.
    this.chooseBestAttack = function(robot) {

        let result = {
            weaponName: "",
            enemy: null,
            reasons: []
        };

        if (!controller.isGameInProgress()) {
            result.reasons.push("Cannot attack.  There is no game in progress.");
            return result;
        }

        if (robot.hitpoints <= 0) {
            result.reasons.push("This robot is dead.  It cannot attack.");
            return result;
        }

        ///////////////////////////////////////////////
        // Constants for tweaking the AI's behavior. //
        ///////////////////////////////////////////////

        let w1 = 1.0; // The weight to give to the threatToSelf score.
        let w2 = 1.0; // The weight to give to the threatToOthers score.
        let w3 = 1.0; // The weight to give to the vulnerabilityToWeaponWithAmmoScore.
        let w4 = 1.0; // The weight to give to the vulnerabilityToWeaponWithoutAmmoScore.
        let w5 = 0.0; // The weight to give to the hatredOfHumanPlayersScore.

        // The AI is stateless--there is presently no place to store an
        // "individual pilot bias" for different robotIds.  What we _can_ do,
        // though, is make robots of different classes behave differently.
        switch(robot.class) {
            case "light":
                // Light robots know two things:
                //
                // (1) That they can barely make a difference against heavy
                //     mechs, and
                // (2) They're gonna die quickly, so if a mech is vulnerable
                //     to their weapons, they need to take advantage of that
                //     _now_.
                w1 = 0.25;
                w2 = 0.5;
                w3 = 1.0;
                w4 = 1.0;
                break;
            case "medium":
                // Medium mechs usually have a surprisingly powerful weapon
                // with limited ammunition, so they can and will go for the
                // highest threats as a priority.  But if a bot is vulnerable
                // to their firepower, they will take notice (and prefer to
                // take it out with a weapon having limitless ammo.)
                w1 = 1.0;
                w2 = 1.0;
                w3 = 0.5;
                w4 = 0.75;
                break;
            case "heavy":
                // Heavy Bots have powerful weapons.  It is their
                // responsibility to use these against the most titanic,
                // threatening Bots on the battlefield, come what may.
                // Lots of tinier enemies are vulnerable to their firepower;
                // they don't care about that.
                w1 = 1.0;
                w2 = 0.75;
                w3 = 0.20;
                w4 = 0.20;
                break;
            case "assault":
                // Assault mechs: Heavy armor, heavier weapons.  They can pick
                // and choose their engagements, so I say they devote their
                // time to helping allies.
                //
                // Since their heaviest weapons have limited ammunition, they
                // will prefer limitless weapons if they can get the job done.
                w1 = 0.75;
                w2 = 1.0;
                w3 = 0.20;
                w4 = 0.25;
                break;
        }


        // So where do we store our "hatred of human beings bias" in a
        // stateless AI?  The answer is that we don't -- we use the factions
        // to guide us.
        //
        // TODO: The hatred could also respond to environmental cues, like how
        // often the human player has shot us.  But then, why restrict that
        // sort of thing to just human-controlled bots?
        if (controller.getGameFactions().length > 2) {
            switch(robot.faction) {
                case "The Star Alliance":
                    // The Star Alliance is an unbiased (though not friendly)
                    // computer opponent--unless you're playing them one on
                    // one, of course.
                    w5 = 0;
                    break;
                case "The Prime Edict":
                    // There's a fine line here.  w5=0.3 is more than enough to
                    // make the Edict hate your guts regardless of other
                    // dangers to it, while w5=0 allows a human to shoot
                    // random computer players and sit back while they turn on
                    // each other in a frenzy of opportunistic killing.
                    w5 = 0.2;
                    break;
                default:
                    // Have a slight disdain for human units.  This generally
                    // turns up only when robots from different factions have
                    // an equally good score.
                    w5 = Math.random() / 10;
                    break;
            }
        }

        // Let's do this heuristically.  We need the following pieces of
        // information for each enemy robot:
        //
        // - The damage we expect them to do to each of the Bots in our
        //   faction, including us (presuming optimal play on their part)
        //   * The weapons we expect them to shoot our allies with
        // - The weapons of ours, with limited and with unlimited ammo, which
        //   would deal the most damage to them
        //
        // We gather this information in two passes and then use linear
        // interpolation to generate a score for each criterion, ranging from
        // 0 to 1.  Multiplying these factors by their respective weights
        // gives us our final score.
        //
        // The robot with the highest score wins the lottery by getting shot.
        //
        // Later on, I'll factor in other scoring factors like "vengeance"
        // (how much a given AI player is tired of being attacked by a
        // given enemy robot or enemy player) and "finesse" (saving at
        // least one round of the most devastating weapon just to kill off
        // the last bot with a final, unfair attack.)

        let mostDangerousEnemy = {
            robot: null,
            expectedDamage: -99999,
            mostDangerousWeapon: null
        };


        /////////////////////////////////////////////////////////////////////
        // First pass: How dangerous are the enemy robots?  What is their  //
        // best weapon against us?  Which one is the biggest threat to us? //
        /////////////////////////////////////////////////////////////////////

        let enemyRobotScores = [];
        let robots = controller.getGameRobots();
        for (let i = 0; i < robots.length; ++i) {

            if (robots[i].faction === robot.faction || robots[i].hitpoints <= 0) {
                continue;
            }
            let enemyRobot = robots[i];

            // Use the expected values of each of this enemy robot's attacks
            // to decide if we should treat it as the most dangerous enemy.
            let bestWeaponsAgainstOurFaction = { };
            for (let j = 0; j < enemyRobot.arsenal.length; ++j) {

                // Find the best weapon the enemy has for attacking each
                // robot in our faction.

                let currentEnemyWeapon = enemyRobot.arsenal[j];
                if (currentEnemyWeapon.ammo < currentEnemyWeapon.ammoPerRound) {
                    // They're out of this one.
                    continue;
                }

                // Simulate an attack on our bots using average
                // values for all of the enemy's weaponry.
                let friendlyRobots = controller.getGameRobots(robot.faction);

                for (let k = 0; k < friendlyRobots.length; ++k) {

                    let friendlyRobot = friendlyRobots[k];
                    let damageReport = enemyRobot.fire(friendlyRobot, currentEnemyWeapon.internalName, Weapon.useExpectedValues, false);
                    let expectedDamage = damageReport.finalDamage;

                    if (!(friendlyRobot.id in bestWeaponsAgainstOurFaction) ||
                        expectedDamage > bestWeaponsAgainstOurFaction[friendlyRobot.id].expectedDamage) {

                        bestWeaponsAgainstOurFaction[friendlyRobot.id] = {
                            expectedDamage: expectedDamage,
                            weapon: currentEnemyWeapon
                        };
                    }

                } // end (for each friendly robot this enemy weapon could attack)
            } // end (for each enemy weapon)

            if (Object.keys(bestWeaponsAgainstOurFaction).length > 0) {
                // If the enemy's best weapon against us is more effective
                // than that previously seen, then it becomes the most
                // dangerous enemy.
                if (mostDangerousEnemy.expectedDamage < bestWeaponsAgainstOurFaction[robot.id].expectedDamage) {
                    mostDangerousEnemy.expectedDamage = bestWeaponsAgainstOurFaction[robot.id].expectedDamage;
                    mostDangerousEnemy.robot = enemyRobot;
                    mostDangerousEnemy.mostDangerousWeapon = bestWeaponsAgainstOurFaction[robot.id].weapon;
                }
            } else {
                // This enemy is out of ammunition and is therefore harmless.
            }

            // Robots start out with no score, but we do know what their
            // most threatening weapon is.
            enemyRobotScores.push({
                robotToTarget                         : enemyRobot,
                score                                 : 0,
                threatToSelfScore                     : 0,
                threatToOthersScore                   : 0,
                vulnerabilityToWeaponWithAmmoScore    : 0,
                vulnerabilityToWeaponWithoutAmmoScore : 0,
                hatredOfHumanPlayersScore             : 0,
                recommendedWeaponWithoutAmmo          : null,
                recommendedWeaponWithAmmo             : null,
                bestWeaponsAgainstOurFaction          : bestWeaponsAgainstOurFaction,
                mostThreatenedAlly                    : null
            });
        } // end (for each enemy robot [first pass])

        if (mostDangerousEnemy.robot === null) {
            // All of the enemies are out of ammo.
            result.reasons.push("No remaining enemy is a threat to us.");
        }


        ////////////////////////////////////////////////////////////////////////
        // Second pass.                                                       //
        //                                                                    //
        // Start awarding scores to each enemy based on practical heuristics. //
        // Each score uses linear interpolation, with 1.0 being the highest   //
        // score for a given criterion and 0.0 being the lowest.              //
        ////////////////////////////////////////////////////////////////////////

        for (let i = 0; i < enemyRobotScores.length; ++i) {

            let enemyRobot = enemyRobotScores[i].robotToTarget;

            // Award a score based on how likely you are to kill us (w1) or
            // our allies (w2).
            let threatToSelfScore = -1;
            let threatToOthersScore = -1;
            let mostThreatenedAlly = null;
            for (let robotId in enemyRobotScores[i].bestWeaponsAgainstOurFaction) {

                let expectedDamageFromBestAttack = enemyRobotScores[i].bestWeaponsAgainstOurFaction[robotId].expectedDamage;
                let currentAlliedRobot = Robot.list()[robotId];
                let score = Math.max(0, Math.min(1, expectedDamageFromBestAttack/currentAlliedRobot.hitpoints));

                if (robotId === robot.id && score > threatToSelfScore) {
                    threatToSelfScore = score;
                } else if (robotId !== robot.id && score > threatToOthersScore) {
                    threatToOthersScore = score;
                    mostThreatenedAlly = currentAlliedRobot;
                }
            }
            enemyRobotScores[i].threatToSelfScore = Math.max(0, threatToSelfScore);
            enemyRobotScores[i].threatToOthersScore = Math.max(0, threatToOthersScore);
            enemyRobotScores[i].mostThreatenedAlly = mostThreatenedAlly;


            // Award a score based on how likely our weapons with ammo (w3)
            // and without ammo (w4) are to kill you.
            let vulnerabilityToWeaponWithoutAmmoScore = -1;
            let vulnerabilityToWeaponWithAmmoScore = -1;
            let recommendedWeaponWithoutAmmo = null;
            let recommendedWeaponWithAmmo = null;
            let hasAmmo = false;
            for (let j = 0; j < robot.arsenal.length; ++j) {
                let currentWeapon = robot.arsenal[j];
                if (currentWeapon.ammo < currentWeapon.ammoPerRound) {
                    continue;
                }

                hasAmmo = true;
                let damageReport = robot.fire(enemyRobot, currentWeapon.internalName, Weapon.useExpectedValues, false);
                let expectedDamage = damageReport.finalDamage;
                let score = Math.max(0, Math.min(1, expectedDamage/enemyRobot.hitpoints));

                if (currentWeapon.ammoPerRound > 0 && score > vulnerabilityToWeaponWithAmmoScore) {
                    recommendedWeaponWithAmmo = currentWeapon;
                    vulnerabilityToWeaponWithAmmoScore = score;
                } else if (currentWeapon.ammoPerRound <= 0 && score > vulnerabilityToWeaponWithoutAmmoScore) {
                    recommendedWeaponWithoutAmmo = currentWeapon;
                    vulnerabilityToWeaponWithoutAmmoScore = score;
                }
            }

            if (!hasAmmo) {
                // All this time!
                result.reasons.push("This robot is out of ammunition.  It cannot attack.");
                return result;
            }

            enemyRobotScores[i].vulnerabilityToWeaponWithoutAmmoScore = Math.max(0, vulnerabilityToWeaponWithoutAmmoScore);
            enemyRobotScores[i].vulnerabilityToWeaponWithAmmoScore = Math.max(0, vulnerabilityToWeaponWithAmmoScore);
            enemyRobotScores[i].recommendedWeaponWithoutAmmo = recommendedWeaponWithoutAmmo;
            enemyRobotScores[i].recommendedWeaponWithAmmo = recommendedWeaponWithAmmo;

            // Award a score based on our sheer hatred of the human race and
            // everyone in it (w5).
            enemyRobotScores[i].hatredOfHumanPlayersScore = 0;
            if (controller.getGameFactions().length > 2 &&
                controller.getFactionType(enemyRobotScores[i].robotToTarget.faction) === "human") {
                enemyRobotScores[i].hatredOfHumanPlayersScore = w5;
            }

            // The final score is the weighted sum of all of these.
            enemyRobotScores[i].score += w1 * enemyRobotScores[i].threatToSelfScore;
            enemyRobotScores[i].score += w2 * enemyRobotScores[i].threatToOthersScore;
            enemyRobotScores[i].score += w3 * enemyRobotScores[i].vulnerabilityToWeaponWithAmmoScore;
            enemyRobotScores[i].score += w4 * enemyRobotScores[i].vulnerabilityToWeaponWithoutAmmoScore;
            enemyRobotScores[i].score +=      enemyRobotScores[i].hatredOfHumanPlayersScore;

        } // end (for each robot that can be scored)


        // Score by highest score, descending.
        enemyRobotScores.sort(function(robotScoreA, robotScoreB) {
            return robotScoreB.score - robotScoreA.score;
        });

        let winner = enemyRobotScores[0];
        result.enemy = enemyRobotScores[0].robotToTarget;
        result.weaponName = (w3 * enemyRobotScores[0].vulnerabilityToWeaponWithAmmoScore >
                             w4 * enemyRobotScores[0].vulnerabilityToWeaponWithoutAmmoScore ?
                             enemyRobotScores[0].recommendedWeaponWithAmmo.internalName :
                             enemyRobotScores[0].recommendedWeaponWithoutAmmo.internalName);

        let hatredOfHumanPlayersMessage = "  We burn with hatred for all the human race.";
        result.reasons.push(String.format("Recommendation: Attack {0} {1} (weighted score {2}) with '{3}' weapon.{4}",
                                          enemyRobotScores[0].robotToTarget.longName,
                                          enemyRobotScores[0].robotToTarget.id,
                                          enemyRobotScores[0].score.toFixed(4),
                                          result.weaponName,
                                          enemyRobotScores[0].hatredOfHumanPlayersScore > 0 ? hatredOfHumanPlayersMessage : ""));
        let mostThreateningWeaponMessage = "It is unarmed!";
        if (robot.id in enemyRobotScores[0].bestWeaponsAgainstOurFaction) {
            mostThreateningWeaponMessage = String.format("Its most dangerous weapon to us is its {0}.",
                                                         enemyRobotScores[0].bestWeaponsAgainstOurFaction[robot.id].weapon.longName);
        }
        result.reasons.push(String.format("Its threat level to us is {0}{1}.  {2}",
                                          enemyRobotScores[0].threatToSelfScore.toFixed(4),
                                          (enemyRobotScores[0].threatToSelfScore >= 1.0 ? " (it can kill us next turn)" : ""),
                                          mostThreateningWeaponMessage));
        result.reasons.push(String.format("Its threat level to our allies is {0}{1}.",
                                          enemyRobotScores[0].threatToOthersScore.toFixed(4),
                                          (enemyRobotScores[0].threatToOthersScore >= 1.0 ? " (it can kill an ally next turn)" : "")));
        if (enemyRobotScores[0].mostThreatenedAlly !== null) {
            result.reasons.push(String.format("Our most vulnerable ally is {0} {1} ({2} hp).",
                                              enemyRobotScores[0].mostThreatenedAlly.longName,
                                              enemyRobotScores[0].mostThreatenedAlly.id,
                                              enemyRobotScores[0].mostThreatenedAlly.hitpoints));
        }
        result.reasons.push(String.format("Our threat level to it is {0} if we want to preserve ammunition and {1} if we don't.",
                                          enemyRobotScores[0].vulnerabilityToWeaponWithoutAmmoScore.toFixed(4),
                                          enemyRobotScores[0].vulnerabilityToWeaponWithAmmoScore.toFixed(4)));
        if (enemyRobotScores.length > 1) {
            let badRobot = enemyRobotScores[enemyRobotScores.length - 1].robotToTarget;
            result.reasons.push(String.format("The worst-scoring enemy was {0} {1} ({2} hp), with a score of {3}.  We are ignoring it.",
                                              badRobot.longName,
                                              badRobot.id,
                                              badRobot.hitpoints,
                                              enemyRobotScores[enemyRobotScores.length - 1].score));
        }
        if (w1 != 1.0 || w2 != 1.0 || w3 != 1.0 || w4 != 1.0) {
            result.reasons.push(String.format("Some weights influenced the final score.  Our weights are w1={0}, w2={1}, w3={2}, w4={3}, w5={4}.",
                                              w1.toFixed(4),
                                              w2.toFixed(4),
                                              w3.toFixed(4),
                                              w4.toFixed(4),
                                              w5.toFixed(4)));
        }
        return result;
    };


    // Plays a round of the game, asking the current robot to choose an enemy
    // and shoot them.  Be careful to only call this when
    // controller.getFactionType(controller.getCurrentRobot().faction) ==
    // "ai", or else the AI will take a turn on the human player's behalf!
    // (Of course, perhaps that is what you want.)
    //
    // If updateView is true (the default), a dialog box will be created to
    // report on the attack.  Making it false results in a silent attack,
    // although the lines of code needed to do that are small enough that you
    // could do that yourself.
    this.playOneRound = function(updateView) {

        updateView = updateView || true;
        let ourBot = controller.getCurrentRobot();
        let turnDialog = null;

        if (updateView) {

            // Create the end-of-turn dialog.
            turnDialog = view.addDialog("turn", "30%", "10%", "40%", "12em", 0/*8000*/, false);
            turnDialog.querySelector(".logo").style.backgroundImage = "url(\"" +
                controller.getFactionIcon(ourBot.faction) + "\")";
            turnDialog.setAttribute("class", "dialog turn enemy red");
            turnDialog.querySelector(".title").style.display = "block";
            turnDialog.querySelector(".title h2").textContent = this.faction;

            // Clicking will close our dialog and start the next turn.
            turnDialog.onclick = view.createAdvanceTurnOnClickHandler(view, turnDialog.id);

            // Did any of our robots get killed in the last few rounds?  If
            // so, remove their divs, but only if we're not a human.  (The
            // humans can remove their own divs.)
            if (controller.getFactionType(ourBot.faction) === "ai") {
                for (let i = 0, robots = controller.getGameRobots(ourBot.faction); i < robots.length; ++i) {
                    if (robots[i].hitpoints <= 0) {
                        view.removeDeadRobot(robots[i]);
                        console.debug(String.format("AiPlayer.playOneRound(): Removing dead {0} {1} from view and controller.", robots[i].longName, robots[i].id));
                        controller.removeRobot(robots[i]);
                    }
                }
            }
        }

        let attackInfo = this.chooseBestAttack(ourBot);
        if (attackInfo.enemy === null || attackInfo.weaponName === "") {
            // This robot can't attack.  There are probably reasons.  We
            // don't really care.

            if (updateView) {
                let p = document.createElement("p");
                p.innerHTML = String.format("The <span class='enemy name'>{0}</span> <strong>passes.</strong>", ourBot.longName);
                turnDialog.querySelector(".text").textContent = "";
                turnDialog.querySelector(".text").appendChild(p);

                // Show the dialog.
                turnDialog.style.display = "block";
            }
            view.updateRobots();

        } else {

            // Let the AI tell us what it's thinking.
            for (let i = 0; i < attackInfo.reasons.length; ++i) {
                console.debug(String.format("{0} {1}: {2}", ourBot.longName, ourBot.id, attackInfo.reasons[i]));
            }

            // If a human player is the target of our wrath, say that "we" are
            // under attack (a phrase that is only meaningful to humans.)
            if (updateView) {
                if (controller.getFactionType(attackInfo.enemy.faction) === "human") {
                    let p = document.createElement("p");
                    p.innerHTML = "<strong>We are under attack!</strong>";
                    turnDialog.querySelector(".text").textContent = "";
                    turnDialog.querySelector(".text").appendChild(p);
                }
            }

            // There have been situations in the past where the current robot
            // changed in the middle of the AI routine, which destroys our
            // ability to attack.  I figured out the root cause that first
            // time (it was GameController.removeRobot(), *as usual*), but I
            // left the emergency logging in just to be sure.
            if (ourBot.id !== controller.getCurrentRobot().id) {
                let currentBot = controller.getCurrentRobot();
                console.error(String.format("AiPlayer.playOneRound(): {0} {1} ({2}) has prepared an attack, but it cannot execute it because the game now thinks that it's {3} {4} ({5})'s turn.  That is a *BUG* and needs to be fixed.  Skipping the {6}'s turn for now.",
                                            ourBot.longName,
                                            ourBot.id,
                                            ourBot.faction,
                                            currentBot.longName,
                                            currentBot.id,
                                            currentBot.faction,
                                            currentBot.longName));
                controller.nextRobot();
                view.showNextDialogOrAdvanceTurn();
                return;
            }


            controller.setCurrentEnemy(attackInfo.enemy.id);
            controller.setCurrentRobotWeapon(attackInfo.weaponName);

            // let ourBot = controller.getCurrentRobot();
            let ourBotWeapon = controller.getCurrentRobotWeapon();
            let theirBot = controller.getCurrentRobotEnemy();
            let o = controller.attackCurrentEnemy();

            if (updateView) {
                // Actually select the controls that the AI function
                // instructed us to select.
                view.selectEnemyRobot(attackInfo.enemy);
                view.selectCurrentRobotWeapon(ourBot, attackInfo.weaponName);

                view.updateRobots();

                // Add sprite effects stemming from the damageReport.
                //
                // Sprite effects are best done after the robot divs have adjusted in size.
                if (theirBot.hitpoints <= 0) {
                    view.explodeRobot(theirBot);
                } else if (o.damageReport.jumped === true) {
                    // Jumping normally means taking no damage, meaning we jump to
                    // the full height.
                    let jumpDurationMilliseconds = 2000;

                    // But if the jump failed (i.e., we jumped, but it did not
                    // prevent all the damage) then we cut off the jump early to
                    // represent a misfire or something.
                    if (o.damageReport.jumped === true &&
                        o.damageReport.jumpDamage.damage < o.damageReport.originalDamage.damage) {
                        jumpDurationMilliseconds /= 10;
                    }

                    const smokeDurationMilliseconds = 1000;
                    view.explode(attackInfo.enemy, "jump", smokeDurationMilliseconds, jumpDurationMilliseconds);
                }

                // Add some narrative to the dialog.
                let p = document.createElement("p");
                p.setAttribute("class", "enemy narrative");
                p.innerHTML = view.weaveNarrative(o.damageReport, ourBot, ourBotWeapon, theirBot);

                let textDiv = turnDialog.querySelector(".text");
                textDiv.appendChild(p);
                // textDiv.appendChild(o.damageReportDOM); // It takes up too much room.

                // Clicking will close our dialog and start the next turn.
                turnDialog.onclick = view.createAdvanceTurnOnClickHandler(view, turnDialog.id);

                // Show the dialog.
                //
                // See common.css for an explanation of why .dialog.turn isn't
                // using "display: block" here like other dialogs do.
                turnDialog.querySelector(".content").style.display = "table-cell";
                turnDialog.style.display = "table";
            }
        }


    };


    // A helper function for Select-a-Mech™.  The computer selects a series of
    // robots at random whose combined scores come as close as feasible to
    // totalPoints * multiplier without going over.
    //
    // Multiplier is interpreted as a difficulty setting, too: if it's less
    // than 1, lighter bots will be favored; if it's greater than 1, heavier
    // bots will be favored.
    this.chooseRobots = function(totalPoints, multiplier) {

        let targetScore = totalPoints * multiplier;
        let weights = [ ];
        let result = [ ];

        // Sort the possible Bots into buckets by class.
        let buckets = { };
        for (let robotInternalName in Robot.dataTable) {
            // No Ukulele products allowed in production code!
            if (robotInternalName === "invalid" || robotInternalName === "invalid2") {
                continue;
            }

            let robotData = Robot.dataTable[robotInternalName];
            if (!(robotData.class in buckets)) {
                buckets[robotData.class] = [];
            }
            buckets[robotData.class].push(robotInternalName);
        }

        ////////////////////////////////////////////////////////////////
        // What are the probabilities that we will choose each class? //
        ////////////////////////////////////////////////////////////////
        if (multiplier <= 0.75) {
            weights = [ 0.50, 0.45, 0.05, 0.00 ];  // Easy.
        } else if (multiplier <= 1.0) {
            weights = [ 0.32, 0.32, 0.32, 0.04 ];  // Normal.
        } else if (multiplier <= 1.25) {
            weights = [ 0.20, 0.35, 0.40, 0.05 ];  // Hard.
        } else if (multiplier <= 1.5) {
            weights = [ 0.10, 0.20, 0.60, 0.10 ];  // Very hard.
        } else {
            weights = [ 0.14, 0.01, 0.50, 0.35 ];  // DIE.  (Almost no mediums; makes more room for the death.)
        }

        // What follows is the CPU version of Select-a-Mech™.
        let minBotScore = new Robot("scarab").score;
        let currentScore = 0;
        while (targetScore - currentScore >= minBotScore) {
            let p = Math.random();
            let robotClass = "";
            if (p <= weights[0]) {
                robotClass = "light";
            } else if (p <= weights[0] + weights[1]) {
                robotClass = "medium";
            } else if (p <= weights[0] + weights[1] + weights[2]) {
                robotClass = "heavy";
            } else /* p <= weights[0] + weights[1] + weights[2] + weights[3] */ {
                robotClass = "assault";
            }

            // Is there a robot in the class that won't exceed our score
            // quota?
            let candidateRobots = [];
            for (let i = 0; i < buckets[robotClass].length; ++i) {
                let internalRobotName = buckets[robotClass][i];
                let robotData = Robot.dataTable[internalRobotName];
                if (robotData.score <= targetScore - currentScore) {
                    // We can afford this Bot.
                    candidateRobots.push(internalRobotName);
                }
            }

            if (candidateRobots.length === 0) {
                // Nope.  This class of Bots is too expensive!
                continue;
            }

            // Choose a random Bot from the affordable candidates.
            //
            // TODO: Under high multipliers, we should take the robot's
            // weaponry and armor into account, too.  Some heavy Bots are
            // better than others.
            let index = random(0, candidateRobots.length - 1);
            let selectedRobotInternalName = candidateRobots[index];
            let selectedRobot = new Robot(selectedRobotInternalName);
            result.push(selectedRobot);
            currentScore += selectedRobot.score;

        } // end (while we can still purchase bots)

        return result;
    };


    // -----------------------------------------------------------------------
    // Public member variables (per-instance variables.)

    this.faction = factionName;

    return this;
}
