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

////////////////////////////////////////////////////////////////////////////
// Defines the UI-independent controller object which utilizes underlying //
// classes to actually run the game.                                      //
////////////////////////////////////////////////////////////////////////////

// Technically speaking, you can play a complete game using only the
// GameController (along with an AiPlayer once you get tired of choosing the
// weapons to fire by hand), but it won't be very fun.

function GameController() {
    "use strict";

    // -----------------------------------------------------------------------
    // Private member variables (closure-local variables.)

    // A hash table of faction name/object pairs.
    // Objects include:
    // - icon: The faction icon's href.
    // - robots: The robots for this faction.
    let factions = { };

    // -----------------------------------------------------------------------
    // Public member functions.

    //////////////////////////////
    // DAMAGE REPORT FUNCTIONS. //
    //////////////////////////////

    // Returns a <div/> containing the appropriate shape for a die with the
    // given number of faces; blazoned within the middle of that span will be
    // the rollValue, appearing as if it were part of the die (kind of.)
    //
    // The height is just a number; the cssHeightUnits can be whatever units
    // CSS supports, such as "px", "em", or "pt".  The ideal units to use are
    // units that scale with text size.
    this.getDiceDOM = function(numberOfFaces, rollValue, height, cssHeightUnits) {
        let span = document.createElement("div");

        let prefix = "dn";
        switch (numberOfFaces) {
            case 2: case 4: case 5:
            case 6: case 8: case 10:
            case 12: case 20:
                prefix = "d" + numberOfFaces;
                break;
        }

        const min = 1, max = 3;
        const color = Math.floor(Math.random() * (max - min + 1)) + min;
        const diceName = prefix + "-" + color;

        span.setAttribute("class", "formula dice " + diceName);
        span.setAttribute("title", String.format("This {0}-sided die rolled a {1}.", numberOfFaces, rollValue));
        span.setAttribute("style",
                          "height: " + height + cssHeightUnits +
                          "; line-height: " + height + cssHeightUnits +
                          "; width: " + height + cssHeightUnits +
                          "; font-size: " + (height * 0.5) + cssHeightUnits);
        span.textContent = rollValue;

        return span;
    };


    // Returns an array of inline and/or floating elements that represent the
    // formula for a given damageObject, including the dice rolls that went
    // into it.
    //
    // - The height and cssHeightUnits arguments serve the same purpose here
    //   as they do in getDiceDOM().
    //
    // - The heightIncrement specifies how much the height should increase (or
    //   decrease) as the formula we print out loses (or gains) parenthetical
    //   nesting levels.  The proper heightIncrement depends crucially on the
    //   cssHeightUnits that we're currently using.
    //
    // Warning: DamageObjects that were not created using the
    // Weapon.useRandomValues argument may be missing the damageStrings needed
    // to display all of the relevant formulas.  This function will still
    // work, but all it will print is the damage itself, which may not be
    // intuitive or satisfying to the user.
    this.getDamageObjectDOM = function(damageObject, height, heightIncrement, cssHeightUnits) {

        // Emergency fallbacks.
        if (cssHeightUnits === undefined && heightIncrement === undefined && height === undefined) {
            // No units supplied, so we can make all of them up together.
            // height = "1.5";
            // heightIncrement = "0.1";
            // cssHeightUnits = "em";
            height = "14";
            heightIncrement = "1";
            cssHeightUnits = "pt";
        } else {
            // Are we missing too much information to go on?
            if (cssHeightUnits === undefined) {
                console.log("GameController.getDamageObjectDOM(): Error: Need CSS" +
                            " height units in order to emit inline styles" +
                            " correctly; try \"em\" or \"pt\".");
                return [];
            } else if (heightIncrement === undefined) {
                console.log("GameController.getDamageObjectDOM(): Error: Need the" +
                            " heightIncrement in order to know how much to grow" +
                            " or shrink fonts at each level of nesting.");
                return [];
            } else if (height === undefined) {
                console.log("GameController.getDamageObjectDOM(): Error:" +
                            " emit DOM objects until we know their height.");
                return [];
            }
        }

        let domObjects = [];
        let domObjectSizes = [];
        let outerFontSize = Number(height);
        const unicodeOperators = {
            plus: "+",
            minus: "-",
            times: "×",
            divide: "÷",
            exponent: "^" // TODO: Represent exponents with <sup></sup>.
        };

        if (damageObject.damageString === undefined ||
            damageObject.damageString.trim().length === 0) {

            // No damage string?  Then all we can do is print the final damage
            // value.
            let div = document.createElement("div");
            div.textContent = damageObject.damage;
            div.setAttribute("style", "font-size: " + height + cssHeightUnits);
            domObjectSizes.push(0);
            domObjects.push(div);

        } else {

            // The values of the dice are stored in damageObject.rolls().
            // Interestingly, a token like "4d6" in the
            // damageObject.damageString will actually be represented by 4
            // separate roll values in the damageObject.rolls[] array (one
            // value for each D6 that was rolled.)  So we need to keep track
            // of which roll we're looking at.

            let currentRollIndex = 0;

            // The general idea here is to loop through the tokens.  Any token
            // which is not a dice token is emitted as-is (possibly subject to
            // growing or shrinking the font size depending on the level of
            // nesting.)  The dice are emitted as actual pictures of dice with
            // the roll number positioned in the middle of them.
            //
            // You know what would be nice here?  A math font.

            let tokens = Weapon.tokenizeDamageString(damageObject.damageString);
            let nestingLevel = 0;

            for (let i = 0; i < tokens.length; ++i) {

                let tokenInfo = tokens[i];
                switch(tokenInfo.type) {
                    case "leftParen":
                    {
                        // We are increasing the level of nesting.  That means
                        // we make all the tokens outside of this nesting
                        // level (including the left paren itself) *bigger*,
                        // as opposed to merely making the content inside
                        // ourselves smaller.
                        let div = document.createElement("div");
                        div.setAttribute("class", "formula left-paren");
                        div.textContent = tokenInfo.token;
                        domObjectSizes.push(nestingLevel);
                        domObjects.push(div);

                        outerFontSize += Number(heightIncrement);
                        nestingLevel += 1;
                        break;
                    }
                    case "rightParen":
                    {
                        // The right parenthesis itself does not share the
                        // nesting level of its content.
                        nestingLevel -= 1;

                        let div = document.createElement("div");
                        div.setAttribute("class", "formula right-paren");
                        div.textContent = tokenInfo.token;
                        domObjectSizes.push(nestingLevel);
                        domObjects.push(div);
                        break;
                    }
                    case "dice":
                    {
                        // Split the MdN token into M and N.
                        let a = tokenInfo.token.split("d");
                        if (a.length !== 2) {
                            console.log("GameController.getDamageObjectDOM():: Internal error: Bad dice" +
                                        " token '" + tokenInfo.token + "' was" +
                                        " somehow not rejected prior to" +
                                        " analysis.");
                            return { damage: 0, rolls: [] };
                        }
                        let numberOfDice = Number(a[0]); // M.
                        let facesPerDie = Number(a[1]);  // N.

                        for (let j = 0; j < numberOfDice; ++j, ++currentRollIndex) {
                            // Only push the current die roll itself.  We
                            // won't know the size of the thing until the
                            // second pass, and we need that size to emit the
                            // DOM.
                            domObjectSizes.push(nestingLevel);
                            domObjects.push(damageObject.rolls[currentRollIndex]);
                        }
                        break;
                    }
                    case "integer":
                    {
                        let div = document.createElement("div");
                        div.setAttribute("class", "formula integer");
                        div.textContent = tokenInfo.token;
                        domObjectSizes.push(nestingLevel);
                        domObjects.push(div);
                        break;
                    }
                    case "plus":
                    case "minus":
                    case "times":
                    case "divide":
                    case "exponent":
                    {
                        let div = document.createElement("div");
                        div.setAttribute("class", "formula operator");
                        div.textContent = unicodeOperators[tokenInfo.type];
                        domObjectSizes.push(nestingLevel);
                        domObjects.push(div);
                        break;
                    }
                    default:
                    {
                        // Control should never make it here.
                        console.log("GameController.getDamageObjectDOM():" +
                                    " Internal error: Unrecognized token type \"" +
                                    tokenInfo.type + "\" for token \"" +
                                    tokenInfo.token + "\" in damageString \"" +
                                    damageObject.damageString + "\"");
                        break;
                    }
                } // end (switch on token type)
            } // end (for each token in the damage string)
        } // end (if we have a damage string to examine)


        // Now that outerFontSize is no longer changing, it's time to
        // determine the final heights for all our elements (except for the
        // dice; they're okay as they are.)
        for (let i = 0; i < domObjects.length; ++i) {
            let element = domObjects[i];
            let nestingLevel = domObjectSizes[i];
            let fontSize = outerFontSize - (nestingLevel * Number(heightIncrement));

            if ("die" in element && "value" in element) {
                // This is a die roll object.  Convert it into DOM now that we
                // know its true final size.
                let facesPerDie = Number(element.die.substr(2));
                domObjects[i] = this.getDiceDOM(facesPerDie, element.value, fontSize, cssHeightUnits);
            } else {
                // The DOM object is fine as it is; we just need to set the
                // final size.
                element.setAttribute("style", "font-size: " + fontSize + cssHeightUnits);
            }
        }

        return domObjects;
    };

    // Returns a single DOM element containing a visual representation of the
    // given DamageReport object (the sort of object returned by Robot.fire().)
    //
    // Outline:
    //
    //     Attacker
    //       Attacker weapon      12 - [4][3]                   5
    //     Defender
    //       Jump                 <5>         PARTIAL SUCCESS  -2
    //       Armor                [4]                          -4
    //     Total damage taken                                 NONE
    //
    // The defender section is only present if the defender has either jump or armor.


    this.getDamageReportDOM = function(attackingRobot, attackerWeaponName, defendingRobot, damageReport) {

        // Determine the size of the formulas that we print in the report.
        //
        // I see no need to provide knobs to tweak this; as long as it's
        // dependent on font size, I figure it'll work well on mobile phones.
        const height = 19;
        const heightIncrement = 1.2;
        const cssHeightUnits = "pt";

        const diceFormulaHeight = height + 2*heightIncrement;

        let table = document.createElement("table");
        table.setAttribute("class", "report");

        // Attacker header row.
        let tr = document.createElement("tr");
        let th = document.createElement("th");
        th.setAttribute("colspan", "4");
        th.setAttribute("class", "attack");
        th.textContent = attackingRobot.longName;
        tr.appendChild(th);
        table.appendChild(tr);

        // Attacker weapon row.
        tr = document.createElement("tr");
        tr.setAttribute("class", "attack");

        let td = document.createElement("td");
        let attackerWeaponObjects = attackingRobot.findWeapons(attackerWeaponName);
        if (attackerWeaponObjects.length === 0) {
            // You don't _have_ that weapon!  Shame on you!
            console.warn("GameController.getDamageReportDOM(): Cannot create a " +
                         "damage report for attackerWeaponName === \"" +
                         attackerWeaponName + "\" because the " +
                         attackingRobot.longName + " does not have that " +
                         "weapon.");
            return document.createElement("table");
        }
        let numberOfWeapons = attackerWeaponObjects.length;

        // Set the label for the (possibly combined) attack weapon(s).
        td.setAttribute("class", "label");
        if (numberOfWeapons === 1) {
            td.textContent = attackerWeaponObjects[0].longName;
        } else {
            td.textContent = attackerWeaponObjects[0].longName + ", " + numberOfWeapons + "x";
        }
        tr.appendChild(td);

        // Attack formula.
        td = document.createElement("td");
        td.setAttribute("class", "calculation");
        let domElements = this.getDamageObjectDOM(damageReport.originalDamage, diceFormulaHeight, heightIncrement, cssHeightUnits);
        for (let i = 0; i < domElements.length; ++i) {
            td.appendChild(domElements[i]);
        }
        tr.appendChild(td);

        // Empty cell.
        td = document.createElement("td");
        tr.appendChild(td);

        // The final attack value.
        td = document.createElement("td");
        td.setAttribute("class", "value");
        if (damageReport.originalDamage.damage > 0) {
            td.textContent = damageReport.originalDamage.damage;
        } else {
            // An attack that produced no results.  Pathetic.
            td.textContent = "0";
            tr.lastChild.setAttribute("class", "status failure");
            tr.lastChild.textContent = "MISFIRED";
        }
        tr.appendChild(td);

        table.appendChild(tr);

        // Only display the defender data if the defender can actually defend
        // and needs to.
        if (damageReport.originalDamage.damage > 0 &&
            (defendingRobot.armor !== "" || defendingRobot.jump === true)) {
            // Defender header row.
            tr = document.createElement("tr");
            th = document.createElement("th");
            th.setAttribute("colspan", "4");
            th.setAttribute("class", "defend");
            th.textContent = defendingRobot.longName;
            tr.appendChild(th);
            table.appendChild(tr);

            // Is the defender capable of jumping?
            if (defendingRobot.jump === true) {
                tr = document.createElement("tr");
                tr.setAttribute("class", "jump");

                // Jump label.
                td = document.createElement("td");
                td.textContent = "Jump";
                td.setAttribute("class", "label");
                tr.appendChild(td);

                // Jump formula.
                td = document.createElement("td");
                td.setAttribute("class", "calculation");
                let domElements =
                        this.getDamageObjectDOM(damageReport.jumpDamage, diceFormulaHeight, heightIncrement, cssHeightUnits);
                for (let i = 0; i < domElements.length; ++i) {
                    td.appendChild(domElements[i]);
                }
                tr.appendChild(td);

                // Report on success or failure and the damage prevented.
                let jumpStatusCell = document.createElement("td");
                let jumpDamagePreventedCell = document.createElement("td");
                if (damageReport.jumped === false) {
                    jumpStatusCell.setAttribute("class", "status failure");
                    jumpDamagePreventedCell.setAttribute("class", "value failure");
                    jumpStatusCell.textContent = "FAILURE";
                    jumpDamagePreventedCell.textContent = "-0";
                } else if (damageReport.jumped === true &&
                           damageReport.jumpDamage.damage < damageReport.originalDamage.damage) {
                    jumpStatusCell.setAttribute("class", "status partial");
                    jumpDamagePreventedCell.setAttribute("class", "value partial");
                    jumpStatusCell.textContent = "PARTIAL SUCCESS";
                    jumpDamagePreventedCell.textContent = -Math.floor(damageReport.jumpDamage.damage);
                } else {
                    jumpStatusCell.setAttribute("class", "status success");
                    jumpDamagePreventedCell.setAttribute("class", "value success");
                    jumpStatusCell.textContent = "SUCCESS";
                    jumpDamagePreventedCell.textContent = "-ALL";
                }
                tr.appendChild(jumpStatusCell);
                tr.appendChild(jumpDamagePreventedCell);

                table.appendChild(tr);
            }

            // Does the defender have armor that would actually have been
            // relevant against this attack?
            if (defendingRobot.armor.trim() !== "" &&
                (damageReport.jumped === false ||
                 (damageReport.jumped === true &&
                  damageReport.jumpDamage.damage < damageReport.originalDamage.damage))) {
                tr = document.createElement("tr");
                tr.setAttribute("class", "armor");

                // Armor label.
                td = document.createElement("td");
                td.setAttribute("class", "label");
                td.textContent = "Armor";
                tr.appendChild(td);

                // Armor formula.
                td = document.createElement("td");
                td.setAttribute("class", "calculation");
                let domElements = this.getDamageObjectDOM(damageReport.armorDamage, diceFormulaHeight, heightIncrement, cssHeightUnits);
                for (let i = 0; i < domElements.length; ++i) {
                    td.appendChild(domElements[i]);
                }
                tr.appendChild(td);

                // Empty cell.
                td = document.createElement("td");
                tr.appendChild(td);

                // Report on the damage prevented by armor.
                td = document.createElement("td");
                td.textContent = -Math.floor(damageReport.armorDamage.damage);
                if (damageReport.armorDamage.damage >= damageReport.originalDamage.damage - damageReport.jumpDamage.damage) {
                    // Complete armor protection.
                    td.setAttribute("class", "value success");
                } else if (damageReport.armorDamage.damage > 0) {
                    // Partial armor protection.
                    td.setAttribute("class", "value partial");
                } else {
                    // Armor that didn't protect you.  How sad.
                    td.setAttribute("class", "value failure");
                    td.textContent = "-0";
                    tr.lastChild.setAttribute("class", "status failure");
                    tr.lastChild.textContent = "INEFFECTIVE";
                }

                tr.appendChild(td);

                table.appendChild(tr);
            }
        } // end (if the defending robot can defend with jumping or armor)


        // Print the total damage taken.
        tr = document.createElement("tr");
        th = document.createElement("th");
        th.setAttribute("colspan", "3");
        th.setAttribute("class", "sum");
        th.textContent = "Damage taken by " + defendingRobot.longName;
        tr.appendChild(th);

        td = document.createElement("td");
        td.setAttribute("class", "sum value");
        if (damageReport.finalDamage === 0) {
            td.textContent = "NONE";
        } else {
            td.textContent = damageReport.finalDamage;
        }
        tr.appendChild(td);
        table.appendChild(tr);

        return table;
    };

    /////////////////////
    // GAME FUNCTIONS. //
    /////////////////////

    // Adds a faction to the game.  There must be at least two factions for
    // the game to proceed.  Note that this function has no effect on the
    // factions for the game that is currently in progress; only future games
    // are affected.
    //
    // The faction name is arbitrary, but will be displayed to the user, so it
    // should be a proper noun.  The factionNameIsSingular argument determines
    // whether aforesaid noun is singular or plural.
    //
    // The factionType must be either "human" or "ai"; an unrecognized
    // factionType will default to "human."
    this.addFaction = function(factionName, factionNameIsSingular, factionType, factionIconHref) {
        if (!(factionName in factions)) {
            if (factionType != "ai" && factionType != "human") {
                console.warn("GameController.addFaction(): Unrecognized" +
                             " faction type \"" + factionType + "\" for new" +
                             " faction \"" + factionName + "\".  Defaulting to" +
                             " \"human.\"");
                factionType = "human";
            }

            factions[factionName] = {
                icon: "",
                name: factionName, // Just in case we need it.
                nameIsSingular: factionNameIsSingular,
                type: factionType,
                currentRobotIndex: 0,
                robots: [],
                original_robots: []
            };
        }
        factions[factionName].icon = factionIconHref;
    };


    // Changes the type of a given faction.  The strings "human" and "ai" are
    // the only allowed types (both in lowercase.)
    //
    // Note that this function has no effect on the factions for the game that
    // is currently in progress; only future games are affected.  If you
    // really want a computer player to play on behalf of a human, generate an
    // AiPlayer for that human player's faction and tell it to
    // playOneRound(true).
    this.setFactionType = function(factionName, factionType) {
        if (!(factionName in factions)) {
            console.error("GameController.setFactionType(): Unrecognized" +
                         "faction name \"%s\".", factionName);
            return;
        }

        if (factionType != "ai" && factionType != "human") {
            console.error("GameController.setFactionType(): Unrecognized" +
                          "faction type \"%s\" for faction \"@s\".",
                          factionType,
                          factionName);
            return;
        }

        factions[factionName].type = factionType;
    };


    // Adds a robot to the given faction.
    this.addRobot = function(factionName, robot) {
        if (!(factionName in factions)) {
            console.log("GameController.addRobot(): Can't add " +
                        robot.longName + " to nonexistent faction \"" +
                        factionName + "\".");
            return;
        }

        robot.faction = factionName; // Just in case we need it later.
        factions[factionName].original_robots.push(robot);
    };

    // Removes the given robot from its faction.  The robot will still exist
    // in the Robot.list and in factions[robot.faction].original_robots.
    //
    // This is meant to be used to eliminate dead bots from consideration by
    // the rest of the *current* game.  (The game will already ignore robots
    // with negative hitpoints, so removing a bot is always optional.)
    this.removeRobot = function(robot) {
        let currentRobot = this.getCurrentRobot();

        if (currentRobot === null) {
            // There should _be_ a current robot.
            console.error(String.format("GameController.removeRobot(): There is no current robot.  Is the game no longer in progress?"));
            return;
        }

        if (currentRobot.hitpoints <= 0) {
            // The current robot is dead.  That shouldn't have happened.
            console.warn(String.format("GameController.removeRobot(): The current robot ({0} {1}) should always have positive hitpoints.  It has {2}.",
                                       currentRobot.longName,
                                       currentRobot.id,
                                       currentRobot.hitpoints));
        }

        if (robot.id === currentRobot.id) {
            // Removing the current robot is probably a bad idea.  It forces
            // us to advance to the next robot, even if the code that's
            // calling us is not prepared for that.
            console.warn(String.format("GameController.removeRobot(): I am being asked to remove the current robot ({0} {1}).  That doesn't seem like a good idea, but proceeding anyway.  (This will call GameController.nextRobot().)",
                                       robot.longName,
                                       robot.id));
            this.nextRobot();
        }

        if (robot.hitpoints > 0) {
            console.warn(String.format("GameController.removeRobot(): I am being asked to remove {0} {1}, but it is still in the game (hitpoints = {2}.)",
                                       robot.longName,
                                       robot.id,
                                       robot.hitpoints));
        }

        // Remove the robot from whatever faction it belongs to (if we can
        // find it.)
        //
        // You'd think this would be easy, but this has historically been one
        // of the buggiest functions in the program.
        let isNotCondemnedRobot = function(item) {
            return (item.id !== robot.id);
        };
        for (let i = 0; i < playingFactions.length; ++i) {

            let faction = playingFactions[i];
            if (faction.name === robot.faction) {
                // Find the index of the robot in this faction that we're
                // removing.
                let indexOfRobotToRemove = -1;
                for (let j = 0; j < faction.robots.length; ++j) {
                    if (faction.robots[j].id === robot.id) {
                        indexOfRobotToRemove = j;
                        break;
                    }
                }

                if (indexOfRobotToRemove >= 0) {
                    // If the robot we're removing comes AT OR BEFORE the index of
                    // this faction's current robot, then that index needs to shift
                    // down since we're on our way out.
                    if (indexOfRobotToRemove <= faction.currentRobotIndex) {
                        faction.currentRobotIndex -= 1;
                        if (faction.currentRobotIndex < 0) {
                            faction.currentRobotIndex = faction.robots.length - 2;
                        }
                    }

                    faction.robots = faction.robots.filter(isNotCondemnedRobot);

                } else {
                    // Control should never make it here.
                    console.warn(String.format("GameController.removeRobot(): Internal error: Can't find index of the robot we want to remove ({0} {1}) in {2}'s robots array.  That should not be possible.",
                                              robot.longName,
                                              robot.id,
                                              faction.name));

                } // end (if we can't find the robot we want to remove within its faction's robots array [which is impossible])
            } // end (if we've found the faction of the robot we want to remove)
        } // end (for each faction)

        // Just in case you deleted the last robot in a faction.
        updateVictoryStatus();
    };


    // The "game" from the GameController's point of view is a state machine.
    // Once started, it cycles through the surviving robots of each faction
    // (in order of the robot's speed) and lets callers know what the current
    // robot is.  The game can then be asked to have the current robot attack
    // a different faction's robot and return the resulting damage report.
    // The caller should ask the view to display that report in whatever way
    // is appropriate for the view.
    //
    // At any time, you can ask the GameController who won, ask what the best
    // robot to attack is (done through an AI helper function:
    // AiPlayer.chooseBestAttack()), or simply enumerate through the robots
    // themselves (both living and dead.)
    //
    // The game's state machine will place itself into the final state once
    // only a single faction has surviving bots.  At that point, the winning
    // faction query function will actually return an answer and that's how
    // you'll know that the game is over.

    let gameInProgress = false;
    let currentFactionIndex = 0;
    let currentWeapon = null;
    let currentEnemy = null;
    let winningFaction = "";
    let playingFactions = [];

    // Does some of the actual work for GameController.resetGame().  This was
    // split off into its own function so that it could be called
    // independently.
    let resetGameState = function() {
        gameInProgress = false;
        currentFactionIndex = 0;
        currentWeapon = null;
        currentEnemy = null;
        winningFaction = "";
        playingFactions = [];
    };


    // To start the game, we need an arbitrary list of participating
    // factions.  Pass them in as arguments to this function.
    this.startGame = function() {
        if (arguments.length <= 1) {
            console.log("GameController.startGame(): Error: Need at least two" +
                        " faction names to start.  Please pass them in as " +
                        " arguments.");
        }

        playingFactions = [];
        for (let i = 0; i < arguments.length; ++i) {
            playingFactions.push(factions[arguments[i]]);
        }

        // Clone the robots so we can restart the game with the same initial
        // conditions easily.
        for (let i = 0; i < playingFactions.length; ++i) {
            let faction = playingFactions[i];
            faction.robots = [];
            for (let j = 0; j < faction.original_robots.length; ++j) {

                // extend(), if not given a 'to' object (the second argument),
                // will call the 'from' object's constructor function with no
                // arguments.  Unfortunately for us, Robot() with no args
                // returns a Munchkin.
                //
                //   let clonedRobot = extend(faction.original_robots[j], null);
                //
                // Of course, that raises the obvious question of why we
                // don't just say "clonedRobot = new Robot(faction.original_robots[j].internalName)"
                // and be done with it.  The answer is that the original robot
                // added to the faction may have been customized -- for
                // instance, it may have had a different weapon or altered
                // hitpoints compared to its ordinary brethren.  We use the
                // constructed version as a template, but then copy these
                // potentially customized properties on top of it.
                //
                let clonedRobot = extend(faction.original_robots[j],
                                         new Robot(faction.original_robots[j].internalName));

                faction.robots.push(clonedRobot);
            }

            // Sort the factions' robot arrays by robot speed.
            //
            // The fastest robot should always go first, so it needs to be
            // first in the array.
            faction.robots.sort(function(robot1, robot2) {
                // If robot1 has a higher speed than robot2, it's faster,
                // meaning it should come first, meaning we should return a
                // negative number.
                return robot2.speed - robot1.speed;
            });

            // GameController.nextRobot() increments the currentRobotIndex for
            // each faction as it gets to it, so initializing this to 0 would
            // mean starting all factions except for player 1 with their
            // _second_ robot.  We want to start with their _first_  (and
            // fastest) robot.
            faction.currentRobotIndex = faction.robots.length - 1;
        }

        // Randomize the faction start order.
        let min = 0;
        let max = playingFactions.length - 1;
        currentFactionIndex = (Math.floor(Math.random() * (max - min + 1)) + min);
        playingFactions[currentFactionIndex].currentRobotIndex = 0;

        // The first robot has no weapon or enemy selected yet.
        currentWeapon = null;
        currentEnemy = null;

        // No one's won yet.
        winningFaction = "";

        gameInProgress = true;
    };


    // Clears the current game completely.  In other words, undoes the effects
    // of GameController.startGame() and GameController.addRobots().  The game
    // will no longer be considered to be in progress, and there will be no
    // winner.  The factions are still left as they are, but you'll need to give each
    // faction new robots before you can play.
    //
    // A warning will be issued to the console if you attempt to clear a game
    // that's currently in progress.  (Recall that a game is in progress if
    // and only if it has started and there is not yet a winning faction.)
    this.resetGame = function() {

        if (this.isGameInProgress() === true) {
            console.warn("GameController.resetGame(): We are killing a game that has not yet ended!");
        }

        resetGameState();

        // If you want to re-add the same robots to the same factions again so
        // that you end up effectively replaying the same game--then hey,
        // that's your problem.
        for (let factionName in factions) {
            factions[factionName].original_robots = [];
        }
    };


    // Query function: Is the game over yet?
    this.isGameInProgress = function() { return gameInProgress; };


    // Internal function: Update the "game in progress" and "winning faction"
    // flags based on which robots are and are not functional.
    let updateVictoryStatus = function() {

        let oldGameInProgress = gameInProgress;

        // Count the number of dead factions.
        let livingFactions = 0;
        let nameOfLastKnownLivingFaction = "";
        for (let i = 0; i < playingFactions.length; ++i) {
            let faction = playingFactions[i];
            let functioningRobots = 0;

            for (let i = 0; i < faction.robots.length; ++i) {
                let currentRobot = faction.robots[i];
                if (currentRobot.hitpoints > 0) {
                    functioningRobots++;
                }
            }
            if (functioningRobots > 0) {
                nameOfLastKnownLivingFaction = faction.name;
                livingFactions++;
            }
        }

        winningFaction = (livingFactions === 1 ? nameOfLastKnownLivingFaction : "");
        gameInProgress = (livingFactions > 1 ? true : false);

        // Someone won.  This isn't the official victory check -- it's just
        // debugging.
        if (gameInProgress != oldGameInProgress) {
            console.log(winningFaction + " has won the game.");
        }
    };


    // Query function: Which faction won?  Returns an empty string if no
    // faction won yet.
    //
    // Note that this function always returns a value, whether there's a game
    // in progress or not.
    this.winningFaction = function() {
        updateVictoryStatus();
        return winningFaction;
    };


    // Query function: Which robots are playing -- or, specifically, which
    // robots were in the game when startGame() was called?
    //
    // If the "factionName" argument is not supplied, all robots will be
    // returned.  Otherwise, only the robots that belong to the given faction
    // will be returned.
    //
    // Note that the Robot objects returned will all have an extra "faction"
    // field indicating the faction they belong to.
    this.getGameRobots = function(factionName) {
        let result = [];
        for (let i = 0; i < playingFactions.length; ++i) {
            for (let faction = playingFactions[i], j = 0; j < faction.robots.length; ++j) {
                if (factionName === undefined || faction.name === factionName) {
                    result.push(faction.robots[j]);
                }
            }
        }
        return result;
    };


    // Query function: Which factions are playing -- or, specifically, which
    // factions were in the game when startGame() when called?
    //
    // Returns a list of faction names.
    this.getGameFactions = function() {
        let result = [];
        for (let i = 0; i < playingFactions.length; ++i) {
            result.push(playingFactions[i].name);
        }
        return result;
    };


    // Query function: which factions were added to the controller, period?
    // Unlike getGameFactions(), this function returns useful results even
    // when there is no game in progress.
    //
    // Returns a list of faction names whose length is greater than or equal
    // the length of the array returned by getGameFactions().
    this.getAllFactions = function() {
        let result = [];
        for (let i = 0, keys = Object.keys(factions); i < keys.length; ++i) {
            result.push(factions[keys[i]].name);
        }
        return result;
    };


    // Query function: what type of player controls the given faction?
    // Returns "human" for human-controlled factions, "ai" for
    // computer-controlled factions, and an empty string if the faction name
    // was invalid.
    //
    // This function considers all factions, not just factions that are
    // currently playing the game.
    this.getFactionType = function(factionName) {
        for (let i = 0, keys = Object.keys(factions); i < keys.length; ++i) {
            if (factions[keys[i]].name === factionName) {
                return factions[keys[i]].type;
            }
        }
        return "";
    };


    // Query function: what is the icon image for this faction?  Returns the
    // URL to the faction's icon image, or an empty string if the faction name
    // was invalid (or if the faction doesn't have an icon, which also should
    // not happen.)
    //
    // This function considers all factions, not just factions that are
    // currently playing the game.
    this.getFactionIcon = function(factionName) {
        for (let i = 0, keys = Object.keys(factions); i < keys.length; ++i) {
            if (factions[keys[i]].name === factionName) {
                return factions[keys[i]].icon;
            }
        }
        return "";
    };


    // Query function: is this faction's name a singular noun?  Returns true
    // if it is or false if it isn't.  If the faction's name is invalid, this
    // function will also return true.
    //
    // This is one of the sillier accessor functions -- it's needed in very
    // few contexts.  Like other faction accessors, it considers all factions,
    // not just factions that are currently playing the game.
    this.isFactionNameSingular = function(factionName) {
        for (let i = 0, keys = Object.keys(factions); i < keys.length; ++i) {
            if (factions[keys[i]].name === factionName) {
                return factions[keys[i]].nameIsSingular;
            }
        }
        return true;
    };


    // Query function: Which robot's turn is it?  If there is no game in
    // progress, returns null.  Otherwise, this function will always return a
    // functioning robot.
    this.getCurrentRobot = function() {
        updateVictoryStatus();
        if (!gameInProgress) {
            return null;
        }
        let faction = playingFactions[currentFactionIndex];
        return faction.robots[faction.currentRobotIndex];
    };


    // Query helper function for GameController.attackCurrentEnemy(): What
    // weapon was selected for the current robot?
    //
    // Returns null if no weapon was selected yet, and a Weapon object
    // otherwise.
    this.getCurrentRobotWeapon = function() {
        let currentRobot = this.getCurrentRobot();
        if (currentRobot === null || currentWeapon === null) {
            return null;
        }
        return currentWeapon;
    };


    // Helper function for GameController.attackCurrentEnemy().
    //
    // Sets the currently-selected weapon of the current robot.  You are not
    // allowed to set a weapon that the current robot does not have or which
    // does not have a single round of ammo left.
    //
    // Since this called Robot.findWeapons() internally, the weaponName can be
    // the desired weapon's shortName, longName, or internalName.
    this.setCurrentRobotWeapon = function(weaponName) {
        let currentRobot = this.getCurrentRobot();
        if (currentRobot === null) {
            console.log("GameController.setCurrentRobotWeapon(): Error: There is no" +
                        " current robot; can't set the current robot's weapon." +
                        " Perhaps the game has already ended?");
            return;
        }

        let matchingWeapons = currentRobot.findWeapons(weaponName);
        if (matchingWeapons.length > 0) {
            // Doesn't matter which matching weapon we return; we can fire
            // all of them (and indeed, that is what GameController.attack()
            // will end up doing anyway.)
            currentWeapon = matchingWeapons[0];
        } else {
            console.log(String.format("GameController.setCurrentRobotWeapon(): Error: Can't set {0} {1}'s weapon to \"{2}\" because the weapon is not present or because it is out of ammo.", currentRobot.longName, currentRobot.id, weaponName));
        }
    };


    // Query helper function for GameController.attackCurrentEnemy(): What
    // enemy was selected as the target for the current robot?
    //
    // Returns null if no enemy was selected yet, and a Robot object
    // otherwise.
    this.getCurrentRobotEnemy = function() {
        let currentRobot = this.getCurrentRobot();
        if (currentRobot === null) {
            return null;
        }
        return currentEnemy;
    };


    // Helper function for GameController.attackCurrentEnemy().
    //
    // Sets the current robot's target to the robot having the given ID.  You
    // are not allowed to set a target robot belonging to the same faction as
    // the current robot.
    this.setCurrentEnemy = function(robotId) {
        let robot = Robot.findRobotById(robotId);
        if (robot === null) {
            console.error("GameController.setCurrentEnemy(): No registered robot " +
                          "has ID '" + robotId + "'.");
            return;
        }
        if (robot.faction === this.getCurrentRobot().faction) {
            console.error("GameController.setCurrentEnemy(): Can't set the " +
                          "current robot's enemy to %s %s because it belongs " +
                          "to the same faction as the current robot (%s)",
                          robot.longName, robot.id, robot.faction);
            return;
        }
        currentEnemy = robot;
    };

    // Advance to the next functioning robot so it can take a turn.
    this.nextRobot = function() {
        updateVictoryStatus();
        if (!gameInProgress) {
            return;
        }

        // Now that we've guaranteed that at least two factions are still in
        // the game, we can get to work.

        let originalFactionName = this.getCurrentRobot().faction;
        while (true) {
            // Move the game onto the next faction.
            currentFactionIndex = (currentFactionIndex + 1) % playingFactions.length;
            let faction = playingFactions[currentFactionIndex];

            // Stop looping once we return to the beginning faction.
            if (faction.name === originalFactionName) {
                break;
            }

            // Find the next playable (i.e., non-dead) robot in this faction.
            for (let i = 0, index = (faction.currentRobotIndex + 1) % faction.robots.length;
                 i < faction.robots.length;
                 ++i, index = (index + 1) % faction.robots.length) {

                let robot = faction.robots[index];
                if (robot.hitpoints > 0) {
                    // Got it.
                    faction.currentRobotIndex = index;
                    currentWeapon = null; // No weapon selected.
                    currentEnemy = null;  // No enemy selected.
                    return;
                }
            }

            // If we made it here, playingFactions[currentFactionIndex] is a
            // dead faction.
        }

        // If control made it here, the only living faction is the faction of
        // the last robot that played.  That means the game's over, but
        // updateVictoryStatus() should have detected that already!
        console.warn("GameController.nextRobot(): Internal error: Only one faction (" +
                     this.getCurrentRobot().faction + " is alive, but" +
                     " GameController.updateVictoryStatus() did not detect" +
                     " this and the game was erroneously reported as still" +
                     " being in progress.  Oh well, at least we know who won now.");
        winningFaction = playingFactions[currentFactionIndex];
        gameInProgress = false;
    };

    // Have the current robot attack the current enemy with the
    // currently-selected weapon.  Returns the resulting damage report DOM, or
    // null if a precondition was not met (there was no current robot,
    // currently-selected enemy, or currently-selected weapon.)
    //
    // Why do we provide this when we already have GameController.attack()?
    // Because of the way the game is played.  The view class allows the user
    // to select both a weapon from the current robot and a target, and the
    // user can only attack once both pieces of data are known.  The
    // alternative would be to prompt the user for these two pieces of data
    // prior to calling attack, which is not as fast or fun.
    this.attackCurrentEnemy = function() {
        updateVictoryStatus();
        if (!gameInProgress) {
            console.log("GameController.attackCurrentEnemy(): Error: There is " +
                        "no game in progress and, therefore, nothing to attack.");
            return null;
        }
        if (currentEnemy === null) {
            console.log("GameController.attackCurrentEnemy(): Error: No " +
                        "current enemy selected.");
            return null;
        }
        if (currentWeapon === null) {
            console.log("GameController.attackCurrentEnemy(): Error: No " +
                        "weapon selected for the current robot.");
            return null;
        }
        return this.attack(currentEnemy, currentWeapon.internalName);
    };


    // Have the current robot attack the given robot with the given weapon
    // from its arsenal.  The attackingWeaponName can be a shortName,
    // longName, or internalName.
    //
    // This function updates the hitpoints of the defending robot as a side
    // effect.  Its return value is on object with two fields:
    //
    // - damageReport: The actual damage report resulting from this attack.
    // - damageReportDOM: A DOM element containing the damage report in
    //                    graphical and easy-to-read form -- this is suitable
    //                    for passing into a view.
    //
    // It is an error to shoot a weapon that the current robot doesn't have or
    // which is out of ammo.  In those cases, this function will return an
    // empty damage report.
    this.attack = function(defendingRobot, attackingWeaponName) {

        let report = {
            originalDamage: { damageString: "", damage: 0, rolls: [] },
            jumped: false,
            jumpDamage: { damageString: "", damage: 0, rolls: [] },
            armorDamage: { damageString: "", damage: 0, rolls: [] },
            finalDamage: 0
        };

        // Don't allow friendly fire.
        if (defendingRobot.faction === this.getCurrentRobot().faction) {
            console.log("GameController.attack(): " + defendingRobot.longName +
                        " " + defendingRobot.id + " is an unacceptable target" +
                        " because it is on the same faction as the attacker (" +
                        "\"" + defendingRobot.faction + "\")");
        }

        let attacker = this.getCurrentRobot();

        // If we fire a weapon that has just run out of ammo, we can't get the
        // damage report DOM for it.  (DOM requires weapon counts.)  So we do
        // a dry-run fire first just to get the report, use that to get the
        // DOM, and _then_ diminish the hitpoints and ammo for real.
        report = attacker.fire(defendingRobot,
                               attackingWeaponName,
                               Weapon.useRandomValues,
                               false);
        let damageReportDOM = this.getDamageReportDOM(attacker,
                                                      attackingWeaponName,
                                                      defendingRobot,
                                                      report);
        let matchingWeapons = attacker.findWeapons(attackingWeaponName);
        for (let i = 0; i < matchingWeapons.length; ++i) {
            let unusedDamageReport = matchingWeapons[i].fire();
        }
        defendingRobot.hitpoints -= report.finalDamage;

        updateVictoryStatus();

        return {
            damageReport: report,
            damageReportDOM: damageReportDOM
        };
    };

    return this;
}
