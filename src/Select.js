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

/////////////////////////////////////////////////////////////////////////////
// Turns the markup for the Select-a-Mech™ dialog into an interactive user //
// interface.                                                              //
/////////////////////////////////////////////////////////////////////////////

// This object manages the selection screen dialog and associated environs.
// As it makes permanent alterations to the DOM the first time it is invoked,
// it is better if there is only ever one of these.
//
// The "view" argument is the view to use for launching the game.
//
// The "maxPlayers" argument determines the number of factions that are
// allowed to play.  The minimum is always two (these are in fact
// automatically added by the constructor); I think screen sizes become
// unreasonable after four or so.
//
// The "allowAiOnly" argument, if false (the default), forces the first player
// added to the UI to be a human and enforces this constraint.

function Select(controller, view, maxPlayers, allowAiOnly) {
    "use strict";

    allowAiOnly = allowAiOnly || false;
    maxPlayers = Number(maxPlayers) || 5; // 2 for _this_ release.


    // -----------------------------------------------------------------------
    // Private member variables (closure-local variables.)

    let factions = controller.getAllFactions();
    let container = document.querySelector(".select-a-mech");
    let leftPanel = container.querySelector(".panel.left");
    let centerPanel = container.querySelector(".panel.center");
    let rightPanel = container.querySelector(".panel.right");
    let that = this;

    // An array of integers representing indices into
    // controller.getAllFactions() -- one integer for each player that the
    // user is trying to add.
    let players = [];

    // An array of arrays of robot internal names, one array of names per
    // faction.  Obviously, any such entries created for computer players will
    // be ignored in the end.
    let factionRobots = [];
    for (let i = 0; i < factions.length; ++i) {
        factionRobots.push([]);
    }

    // A hashtable mapping faction names to:
    // -> ANOTHER hashtable mapping score/multiplier pairs to:
    // ---> Arrays of robots.
    //
    // We have 6 possible score counts and 5 possible difficulties, leading to
    // up to 30 robot arrays *per* *faction*.  To make this a little less
    // ridiculous, the arrays are populated on-demand as needed.  But they are
    // only populated once!
    //
    // "Why only once," you might ask.  It's simple: choosing the enemy forces
    // well in advance prevents users from gaming the system by switching the
    // difficulty or total score over and over again, hoping for an easier
    // roll!
    let factionComputerForces = { };

    // This boolean is set to true whenever two players have (erroneously)
    // been assigned to the same faction.
    let factionConflict = false;


    // -----------------------------------------------------------------------
    // Initial validation.

    if (!container) {
        console.error("Select(): Can't find the .select-a-mech container." +
                      " There's nothing further to do.");
        return null;
    }

    // Are there enough factions to actually play a game?
    if (controller.getAllFactions().length < 2) {
        console.error("Select(): Currently, only %d factions have been" +
                      " registered with GameController.addFaction(), but at" +
                      " least two are needed to play the game.",
                     controller.getAllFactions().length);

        container.querySelector(".panel.left").textContent = "Not enough factions to play.";
        container.style.display = "block";
        return this;
    }

    // To ensure that we never have two players with the same faction, we may
    // have to limit the number of players to fewer than what the caller
    // desired.
    if (maxPlayers > factions.length) {
        maxPlayers = factions.length;
    }

    // -----------------------------------------------------------------------
    // Private member functions (closure-local functions.)


    // Generates the CPU forces for all factions at the given point limit and
    // multiplier, but only once.
    let updateFactionComputerForces = function(score, multiplier) {

        let key = String.format("{0}/{1}", score, multiplier);

        for (let i = 0; i < factions.length; ++i) {
            let aiPlayer = new AiPlayer(factions[i], controller, null);

            // Create the second-level hashtable if it doesn't exist.
            if (!(factions[i] in factionComputerForces)) {
                factionComputerForces[factions[i]] = { };
            }

            let secondLevelTable = factionComputerForces[factions[i]];

            if (!(key in secondLevelTable)) {
                secondLevelTable[key] = aiPlayer.chooseRobots(score, multiplier);
            }
        }
    };


    // Obtains the computer forces for the given faction at the given
    // difficulty parameters, generating them first if need be.
    let getComputerForces = function(factionName, score, multiplier) {
        updateFactionComputerForces(score, multiplier);

        let key = String.format("{0}/{1}", score, multiplier);
        return factionComputerForces[factionName][key];
    };


    // Creates one label saying "foo's forces" or the like for each faction
    // foo.  Only factions that are human will have *visible* labels, though.
    //
    // This only needs to be done once.
    let createRobotRowLabels = function() {
        for (let i = 0; i < factions.length; ++i) {
            let factionClass = String.format("player-{0}", i);

            let label = document.createElement("label");
            label.setAttribute("class", factionClass);
            label.textContent = String.format("{0}", factions[i]);
            label.style.display = "none";
            container.querySelector(".robot-list").appendChild(label);

            let quotaDiv = document.createElement("div");
            quotaDiv.setAttribute("class", String.format("quota {0}", factionClass));
            quotaDiv.style.display = "none";
            container.querySelector(".robot-list").appendChild(quotaDiv);

            let rowContainer = document.createElement("div");
            rowContainer.setAttribute("class", String.format("row-container {0}", factionClass));
            container.querySelector(".robot-list").appendChild(rowContainer);
        }
    };

    // Loops through the existing rows of added players, and marks any rows
    // that have duplicate factions using a CSS class.
    let markDuplicateFactions = function() {
        factionConflict = false;
        let factionNameToRowNumber = { };
        let playerRows = container.querySelectorAll(".player-list .player.row");

        for (let rowIndex = 0; rowIndex < players.length; ++rowIndex) {
            let select = playerRows[rowIndex].querySelector(".team");
            let selectedFaction = factions[select.value];

            if (!(selectedFaction in factionNameToRowNumber)) {
                // No duplicate yet.  Set our row to unmarked.
                factionNameToRowNumber[selectedFaction] = rowIndex;
                select.setAttribute("class", "team");
            } else {
                // Duplicate found!
                factionConflict = true;

                // Mark the existing row....
                let otherRowIndex = factionNameToRowNumber[selectedFaction];
                let otherSelect = playerRows[otherRowIndex].querySelector(".team");
                otherSelect.setAttribute("class", "team invalid");

                // ...And mark us, too.
                select.setAttribute("class", "team invalid");
            }
        }
        validateAndUpdateGoButton();
    };


    // Looks at the current faction selections for each player, then assures
    // that the faction's flag appears to the right of that row.'
    let updatePlayerRowFlags = function() {

        let playerRows = container.querySelectorAll(".player-list .player.row");

        for (let i = 0; i < playerRows.length; ++i) {

            let selectedIndex = Number(playerRows[i].querySelector(".team").value);
            let flagDiv = playerRows[i].querySelector(".flag");
            let faction = factions[selectedIndex];

            flagDiv.style.backgroundImage = String.format("url('{0}')",
                                                          controller.getFactionIcon(faction));
        }
    };


    // Clones the #player-row-template element the given number of times, then
    // deletes it permanently.  The cloned rows start out unrendered (display:
    // none.)  Call addPlayerRow() to make them visible.
    let createPlayerRows = function(numberOfRows) {

        let playerRowTemplate = container.querySelector("#player-row-template");

        // Populate the template so we have something useful to clone.
        if (playerRowTemplate) {

            // Clear existing factions.
            let factionSelect = playerRowTemplate.querySelector(".team");
            while (factionSelect.hasChildNodes()) {
                factionSelect.removeChild(factionSelect.lastChild);
            }

            // Add the current set of factions.
            let factions = controller.getAllFactions();
            for (let i = 0; i < factions.length; ++i) {

                let option = document.createElement("option");
                option.setAttribute("value", i);
                option.textContent = factions[i];
                factionSelect.appendChild(option);

            } // end (for each existing faction in the controller)

            // Disable and hide the add and remove buttons by default.  They
            // will be re-enabled on a case-by-case basis.
            let addButton = playerRowTemplate.querySelector(".add");
            addButton.setAttribute("class", "add disabled");
            addButton.setAttribute("disabled", "disabled");
            addButton.style.visibility = "hidden";
            let removeButton = playerRowTemplate.querySelector(".remove");
            removeButton.setAttribute("class", "remove disabled");
            removeButton.setAttribute("disabled", "disabled");
            removeButton.style.visibility = "hidden";

            // All of the rows will start out invisible (and then fade into
            // view when "added".)
            playerRowTemplate.style.display = "none";
            playerRowTemplate.style.opacity = 0;

            // Clone the template to create all the rows we'll ever need.
            let playerListDiv = leftPanel.querySelector(".player-list");
            for (let rowIndex = 0; rowIndex < maxPlayers; ++rowIndex) {

                let clonedRow = playerRowTemplate.cloneNode(true);
                clonedRow.removeAttribute("id");
                clonedRow.setAttribute("class", "player row");
                let clonedRowAddButton = clonedRow.querySelector(".add");
                let clonedRowRemoveButton = clonedRow.querySelector(".remove");

                clonedRow.querySelector(".type").onchange = function() {
                    // The user has changed our player type.
                    players[rowIndex].type = this.value;
                    updateRobotListsForHumanFactions();
                    updatePlayerPointQuotas();
                    that.updateRightPanel();
                };

                clonedRow.querySelector(".team").onchange = function() {
                    // The user has changed our faction.
                    players[rowIndex].factionIndex = Number(this.value);
                    updatePlayerRowFlags();
                    markDuplicateFactions();
                    updateRobotListsForHumanFactions();
                    updatePlayerPointQuotas();
                    that.updateRightPanel();
                };

                playerListDiv.appendChild(clonedRow);

            } // end (for each row that we need to clone)

            // The template has served its purpose.
            playerRowTemplate.remove();

        } // end (if there is a template row we can clone)
    };


    // Updates the status of the "add" and "remove" buttons for each active
    // row of the player selection form.
    let updatePlayerAddRemoveButtons = function() {
        let playerRows = container.querySelectorAll(".player-list .player.row");
        for (let i = 0; i < playerRows.length; ++i) {

            let addButton = playerRows[i].querySelector(".add");
            let removeButton = playerRows[i].querySelector(".remove");
            if (i < players.length - 1) {
                // Not the last row.  Disable the add and remove buttons.
                removeButton.style.visibility = "hidden";
                removeButton.setAttribute("class", "remove disabled");
                removeButton.setAttribute("disabled", "disabled");
                removeButton.onclick = null;
                removeButton.onkeydown = null;

                addButton.style.visibility = "hidden";
                addButton.setAttribute("class", "add disabled");
                addButton.setAttribute("disabled", "disabled");
                addButton.onclick = null;
                addButton.onkeydown = null;
            } else {
                // Last row.  Enable the add button if we *can* add any more
                // players, and enable the remove button as long as that
                // wouldn't cause us to lose the minimum player count of 2.

                if (i < maxPlayers - 1) {
                    addButton.style.visibility = "visible";
                    addButton.setAttribute("class", "add");
                    addButton.removeAttribute("disabled");
                    addButton.onclick = that.addPlayerRowAtEnd;
                    addButton.onkeydown = function(keyboardEvent) {
                        switch (keyboardEvent.key) {
                            case " ":
                            case "Enter":
                                that.addPlayerRowAtEnd();
                                break;
                        }
                    };
                }

                if (i >= 2) {
                    removeButton.style.visibility = "visible";
                    removeButton.setAttribute("class", "remove");
                    removeButton.removeAttribute("disabled");
                    removeButton.onclick = that.removePlayerRowFromEnd;
                    removeButton.onkeydown = function(keyboardEvent) {
                        switch (keyboardEvent.key) {
                            case " ":
                            case "Enter":
                                that.removePlayerRowFromEnd();
                                break;
                        }
                    };
                }
            }
        }
    };


    // This utility replaces players.indexOf(factionIndex), since players[i]
    // is an object with several fields now rather than just being an integer.
    //
    // Returns the index of the player which "owns" this faction at the moment.
    let findPlayerWithFactionIndex = function(factionIndex) {
        for (let i = 0; i < players.length; ++i) {
            if (players[i].factionIndex === factionIndex) {
                return i;
            }
        }
        return -1;
    };


    // Ensures that the #robot-row-template contains all of the Bots present
    // in the game.
    let setupRobotRowTemplate = function() {

        // We can get everything we need from the list of possible robots, but
        // right now, there's only one place where that is stored.
        let classToInternalNameList = {};
        for (let robotInternalName in Robot.dataTable) {
            if (robotInternalName === "invalid" || robotInternalName === "invalid2") {
                // Skip the Ukulele test bots.
                continue;
            }

            let robotData = Robot.dataTable[robotInternalName];
            if (!(robotData["class"] in classToInternalNameList)) {
                classToInternalNameList[robotData["class"]] = [];
            }
            classToInternalNameList[robotData["class"]].push(robotInternalName);
        }


        let robotRowTemplate = container.querySelector("#robot-row-template");
        let select = robotRowTemplate.querySelector(".type");
        for (let className in classToInternalNameList) {
            // Sort the arrays in the hashtable by points, ascending.
            let internalNameList = classToInternalNameList[className];
            internalNameList.sort(function(name1, name2) {
                return Robot.dataTable[name1].score - Robot.dataTable[name2].score;
            });

            // Populate the drop-down menu, including disabled "headers" for
            // the class names.
            let optionHeader = document.createElement("option");
            optionHeader.setAttribute("disabled", "disabled");
            optionHeader.setAttribute("class", "heading");
            optionHeader.textContent = String.format("{0}{1} Bots",
                                                     className[0].toUpperCase(),
                                                     className.substr(1).toLowerCase());
            select.appendChild(optionHeader);

            for (let i = 0; i < internalNameList.length; ++i) {
                let option = document.createElement("option");
                option.value = internalNameList[i];
                option.textContent = String.format("{0} ({1} points)",
                                                   Robot.dataTable[internalNameList[i]].longName,
                                                   Robot.dataTable[internalNameList[i]].score);

                // The Scarab is selected by default.
                if (internalNameList[i] == "scarab") {
                    option.setAttribute("selected", "selected");
                }

                select.appendChild(option);
            }
        }

        robotRowTemplate.style.display = "none";
        robotRowTemplate.style.opacity = "0";
    };

    // Adds the given robot to the given player.
    //
    // Attempts to call this on players that are not currently assigned as
    // human will be ignored.
    //
    // Note that this function will allow you to exceed your player's quota.
    let addRobot = function(factionIndex, robotInternalName) {

        // Find the player having the given faction.
        let index = findPlayerWithFactionIndex(factionIndex);
        if (index < 0) {
            // This faction is not assigned to a player yet, so it gets no
            // robots.
            console.debug("Select/addRobot(): Can't add a robot to faction %d (%s) because no player is assigned to this faction yet.",
                          factionIndex,
                          factions[factionIndex]);
            return;
        }

        // Quick sanity check.
        let playerRows = document.querySelectorAll(".player-list .row");
        if (index >= playerRows.length) {
            console.debug("Select/addRobot(): Internal error: our faction (%s) is assigned to player #%d, but the UI doesn't _have_ player row #%d.",
                          factions[factionIndex],
                          index,
                          index);
            return;
        }


        if (players[index].type === "human") {
            // Finally!
            factionRobots[factionIndex].push(robotInternalName);
        } else {
            console.debug("Select/addRobot(): Internal error: Attempted to add robot '%s' to player %d (%s), but player %d is not a human.",
                          robotInternalName,
                          index,
                          factions[factionIndex],
                          index);
        }
    };


    let removeRobotAtEnd = function(factionIndex) {
        if (factionIndex >= 0 && factionIndex < factionRobots.length) {
            if (factionRobots[factionIndex].length > 0) {
                factionRobots[factionIndex].pop();
            }
        } else {
            console.warn("Select/removeRobot(): Faction index '{0}' is invalid.",
                         factionIndex);
        }
    };


    // Makes sure the list of robots displayed for human users matches the
    // factionRobots hashtable.  This may involve adding, removing, slicing,
    // and dicing.
    let updateRobotListsForHumanFactions = function() {

        let getRobotSelectChangeFunction = function(factionIndex, robotIndex) {
            return function(event) {
                let internalRobotName = event.target.value;
                factionRobots[factionIndex][robotIndex] = internalRobotName;
                updatePlayerPointQuotas();
                that.updateCenterPanel(internalRobotName);
            };
        };

        let robotRowTemplate = container.querySelector("#robot-row-template");
        let playerRows = container.querySelectorAll(".player-list .player.row");

        for (let factionIndex = 0; factionIndex < factions.length; ++factionIndex) {

            let robotInternalNames = factionRobots[factionIndex];
            let factionClass = String.format("player-{0}", factionIndex);
            let factionRobotRows = container.querySelectorAll(String.format(".robot-list .row.{0}",
                                                                            factionClass));

            // Find the player (or *a* player, if the user's got an erroneous
            // faction conflict at the moment) having this faction.

            let playerIndex = findPlayerWithFactionIndex(factionIndex);
            let noPlayerForThisFaction = false;
            if (playerIndex < 0) {
                noPlayerForThisFaction = true;
            }
            let thisFactionIsHuman = false;
            if (playerIndex >= 0) {
                // This faction has an associated player, so we can get the
                // player's type.
                if (players[playerIndex].type === "human") {
                    thisFactionIsHuman = true;
                }
            }

            if (thisFactionIsHuman && robotInternalNames.length === 0) {

                // If this is a human player, they need at least one robot
                // present.  (Otherwise, how will they add or remove
                // anything?)
                //
                // Why the Scarab?  I dunno.  Why not?
                robotInternalNames.push("scarab");

            } else if (!thisFactionIsHuman || noPlayerForThisFaction) {

                // Disappear all of the robot row elements
                // for this faction.
                for (let i = 0; i < factionRobotRows.length; ++i) {
                    factionRobotRows[i].remove();
                }
                let label = container.querySelector(String.format(".robot-list label.{0}", factionClass));
                label.style.display = "none";
                let quotaDiv = container.querySelector(String.format(".quota.{0}", factionClass));
                quotaDiv.style.display = "none";

                // I suppose we don't have to clear the internal "robot
                // memory", too, but it feels more consistent to do this.
                factionRobots[factionIndex] = [];
                continue;
            }


            // Alright, let's see what's up on the screen.
            if (robotInternalNames.length > factionRobotRows.length) {
                // We need more rows in order to catch up with addRobot().
                for (let i = 0, delta = robotInternalNames.length - factionRobotRows.length;
                     i < delta;
                     ++i) {

                    let clonedRow = robotRowTemplate.cloneNode(true);
                    clonedRow.removeAttribute("id");
                    clonedRow.setAttribute("class", String.format("row {0}", factionClass));
                    clonedRow.style.display = "block";

                    let robotSelect = clonedRow.querySelector(".type");
                    robotSelect.onchange = getRobotSelectChangeFunction(factionIndex, factionRobotRows.length + i);

                    // Where will we put it?
                    if (factionRobotRows.length === 0) {
                        // Makes the label visible if it wasn't before.
                        let label = container.querySelector(String.format(".robot-list label.{0}", factionClass));
                        label.style.display = "block";
                        let quotaDiv = container.querySelector(String.format(".quota.{0}", factionClass));
                        quotaDiv.style.display = "block";
                    }
                    let rowContainer = container.querySelector(String.format(".robot-list .row-container.{0}", factionClass));
                    rowContainer.appendChild(clonedRow);

                    clonedRow.style.opacity = "1.0";
                } // end (for each row that needs to be added to the UI)

            } else if (robotInternalNames.length < factionRobotRows.length) {
                // We need fewer rows in order to catch up with removeRobotAtEnd().
                for (let i = 0, delta = factionRobotRows.length - robotInternalNames.length;
                     i < delta;
                     ++i) {

                    factionRobotRows[factionRobotRows.length - 1 - i].remove();
                }
            }

            // At this point, the number of rows in the UI matches the number
            // of robots in the factionRobots array.  Now make sure the robots
            // match, too.
            for (let i = 0; i < factionRobotRows.length; ++i) {
                let robotSelect = factionRobotRows[i].querySelector(".type");
                robotSelect.value = robotInternalNames[i];
            }

        } // end (for each player)

        updateAddRemoveRobotButtons();
    };


    // Iterates all of the robot rows in the left panel, ensuring that the
    // "add" and "remove" buttons work the way you'd expect.
    let updateAddRemoveRobotButtons = function () {

        let getAddFunction = function(factionIndex) {
            return function(event) {
                // let robotSelect = this.parentNode.querySelector(".type");
                // addRobot(factionIndex, robotSelect.value);
                //
                // The new robot's going to be a Scarab, so add it in anticipation.
                // This keeps the running point totals correct.
                addRobot(factionIndex, "scarab");
                updateRobotListsForHumanFactions();
                updatePlayerPointQuotas();
            };
        };

        let getRemoveFunction = function(factionIndex) {
            return function(event) {
                let robotSelect = this.parentNode.querySelector(".type");
                removeRobotAtEnd(factionIndex);
                updateRobotListsForHumanFactions();
                updatePlayerPointQuotas();
            };
        };

        for (let factionIndex = 0; factionIndex < factions.length; ++factionIndex) {
            let factionClass = String.format("player-{0}", factionIndex);
            let factionRobotRows = container.querySelectorAll(String.format(".robot-list .row.{0}",
                                                                            factionClass));

            for (let i = 0; i < factionRobotRows.length; ++i) {

                let addButton = factionRobotRows[i].querySelector(".add");
                let removeButton = factionRobotRows[i].querySelector(".remove");

                // Only show the add/remove buttons on the final row.
                // Everywhere else, disable and hide them.  (Robot order
                // hardly matters anyway, as the fastest robots in a faction
                // always go first.)

                if (i < factionRobotRows.length - 1) {

                    addButton.setAttribute("disabled", "disabled");
                    addButton.setAttribute("class", "add disabled");
                    addButton.style.visibility = "hidden";
                    removeButton.setAttribute("disabled", "disabled");
                    removeButton.setAttribute("class", "remove disabled");
                    removeButton.style.visibility = "hidden";

                } else {

                    addButton.removeAttribute("disabled");
                    addButton.setAttribute("class", "add");
                    addButton.style.visibility = "visible";
                    removeButton.removeAttribute("disabled");
                    removeButton.setAttribute("class", "remove");
                    removeButton.style.visibility = "visible";

                    // Plug in the handlers just in case.
                    let robotSelect = factionRobotRows[i].querySelector(".type");
                    let robotInternalName = robotSelect.value;

                    addButton.onclick = getAddFunction(factionIndex);
                    removeButton.onclick = getRemoveFunction(factionIndex);
                }
            }
        }
    };


    // Updates the pointQuota for each player, and displays the warning colors
    // if a player has exceeded the quota.
    let updatePlayerPointQuotas = function() {
        let pointQuota = Number(container.querySelector(".points").value);

        for (let i = 0; i < players.length; ++i) {
            let currentPoints = calculatePlayerPoints(i);

            let factionClass = String.format("player-{0}", players[i].factionIndex);
            let quotaDiv = container.querySelector(String.format(".quota.{0}", factionClass));
            quotaDiv.textContent = String.format("{0}/{1}", currentPoints, pointQuota);

            if (currentPoints > pointQuota) {
                players[i].exceededQuota = true;
                quotaDiv.setAttribute("class", String.format("quota {0} exceeded", factionClass));
            } else {
                players[i].exceededQuota = false;
                quotaDiv.setAttribute("class", String.format("quota {0}", factionClass));
            }
        }
        validateAndUpdateGoButton();
    };


    // Sums the points for all of the Bots that a player has chosen.
    let calculatePlayerPoints = function(playerIndex) {

        let factionIndex = players[playerIndex].factionIndex;
        let sum = 0;
        for (let i = 0; i < factionRobots[factionIndex].length; ++i) {
            let robotInternalName = factionRobots[factionIndex][i];
            sum += Robot.dataTable[robotInternalName].score;
        }
        return sum;
    };


    // A helper function called on-demand whenever there's a possibility that
    // the user's changes could make the game impossible to start.
    let validateAndUpdateGoButton = function() {

        let reason = "";
        if (factionConflict) {
            reason += "one or more players are assigned to the same faction";
        }

        for (let i = 0; i < players.length; ++i) {
            if (players[i].exceededQuota) {
                reason += (reason === "" ? "" : ", and because ");
                reason += "one or more players have exceeded their quotas for this difficulty level";
                break;
            }
        }

        let goButton = container.querySelector(".go");
        if (reason != "") {
            reason = "Cannot start the game because " + reason + ".";
            goButton.setAttribute("class", "go disabled");
            goButton.setAttribute("disabled", "disabled");
            goButton.setAttribute("title", reason);
        } else {
            // Everything looks good.
            goButton.setAttribute("class", "go");
            goButton.removeAttribute("disabled");
            goButton.setAttribute("title", "Play the game");
        }
    };


    // -----------------------------------------------------------------------
    // Public member functions (per-instance functions.)


    // Removes the last player row from the game setup form.
    this.removePlayerRowFromEnd = function() {
        let playerRows = container.querySelectorAll(".player-list .player.row");

        if (players.length > 2) {
            let lastRow = playerRows[players.length - 1];

            lastRow.style.opacity = "0";
            window.setTimeout(function() {
                // Only disappear after the user can no longer see us.  It's
                // fancier that way.
                lastRow.style.display = "none";
            }, 500);

            players.pop();
        }
        updatePlayerAddRemoveButtons();
        markDuplicateFactions();
        updateRobotListsForHumanFactions();
        that.updateRightPanel();
    };


    // Adds a player row to the game setup form at the end of the last
    // existing row.
    this.addPlayerRowAtEnd = function() {

        let playerRows = container.querySelectorAll(".player-list .player.row");

        if (players.length < maxPlayers) {
            // Remember: the player rows already exist.  They need only be
            // made visible.
            let nextRow = playerRows[players.length];
            nextRow.style.display = "block";

            // The default selection for row #N is just faction #N.  That
            // might cause a conflict, of course; the user will have to
            // resolve that themselves.
            nextRow.querySelector(".team").value = players.length;

            players.push({
                factionIndex: players.length,
                type: nextRow.querySelector(".type").value,
                exceededQuota: false
            });
            nextRow.style.opacity = "1";
        }
        updatePlayerAddRemoveButtons();
        markDuplicateFactions();
        updatePlayerRowFlags();
        updateRobotListsForHumanFactions();
        updatePlayerPointQuotas();
        that.updateRightPanel();
    };


    // Populates the central panel with statistics from the Robot.dataTable
    // entry for the given robot type.
    this.updateCenterPanel = function(internalRobotName) {

        centerPanel.querySelector(".stats").style.display = "block";
        centerPanel.querySelector(".description").style.display = "block";

        let robotData = Robot.dataTable[internalRobotName];

        centerPanel.querySelector(".stats .bot-name").textContent = String.format("{0} {1}", robotData.modelNumber, robotData.longName);

        let classString = String.format("{0}{1}",
                                        robotData.class[0].toUpperCase(),
                                        robotData.class.substr(1).toLowerCase());
        centerPanel.querySelector(".stats .bot-class").textContent = classString;

        // A fast robot has speed 30, which should be -- I dunno, 167
        // kilometers per hour.
        let speed_to_kph = 167/30;
        let speedString = String.format("{0} kph",
                                       (robotData.speed * speed_to_kph).toFixed(1));
        centerPanel.querySelector(".stats .bot-speed").textContent = speedString;

        // Armor is an expression!  Calculate the average damage and just show
        // that.
        //
        // A contemporary M1A2 Abrams main battle tank has about 1300mm of
        // armor in its most protected places.  I say that corresponds to an
        // armor rating of 2.9 in this game.
        //
        // I also say, so says I, that no bot has less than three inches of armor
        // plating.
        const minArmor = 25.4 * 3;
        let armor_to_mm = 1300/2.9;
        let damageObject = Weapon.calculateDamage(robotData.armor, Weapon.useExpectedValues);
        let armorRatingMillimeters = Math.max(minArmor, damageObject.damage * armor_to_mm);
        let armorString = String.format("{0} mm (approx.)",
                                       armorRatingMillimeters.toFixed(0));

        centerPanel.querySelector(".stats .bot-armor").textContent = armorString;
        centerPanel.querySelector(".stats .bot-jump").textContent = (robotData.jump ? "Yes" : "No");
        centerPanel.querySelector(".description").innerHTML = robotData.description;

        // With the image dimensions, I could do mass as well (admittedly, it
        // would be just another meaningless statistic.)

        // Populate the weapons.
        let weaponsTable = container.querySelector(".weapons");
        let weaponRowTemplate = container.querySelector("#weapon-row-template");

        while (weaponRowTemplate.parentNode.children.length > 2) {
            // Clear all the weapon rows except for the template and the header.
            weaponRowTemplate.parentNode.removeChild(weaponRowTemplate.parentNode.lastChild);
        }

        // Collect the arsenal data together -- we don't list the same weapon
        // three times if the 'Bot has three of them, but we do make a note of
        // it in the "quantity" column.
        let weaponCounts = { };
        for (let i = 0; i < robotData.arsenal.length; ++i) {
            if (!(robotData.arsenal[i] in weaponCounts)) {
                weaponCounts[robotData.arsenal[i]] = {
                    count: 0,
                    index: i
                };
            }
            weaponCounts[robotData.arsenal[i]].count++;
        }

        // Generate the new rows.
        for (let weaponInternalName in weaponCounts) {
            let weapon = new Weapon(weaponInternalName);
            let clonedRow = weaponRowTemplate.cloneNode(true);
            clonedRow.removeAttribute("id");

            let weaponClassString = String.format("{0}{1}",
                                                 weapon.class[0].toUpperCase(),
                                                 weapon.class.substr(1).toLowerCase());

            let ammoString = weapon.ammo;
            if (weapon.ammoPerRound === 0) {
                ammoString = "∅";
            }

            clonedRow.querySelector(".class").textContent = weaponClassString;
            clonedRow.querySelector(".name").textContent = weapon.longName;
            clonedRow.querySelector(".quantity").textContent = weaponCounts[weaponInternalName].count;
            clonedRow.querySelector(".ammo").textContent = ammoString;
            clonedRow.style.display = "";

            // weaponRowTemplate.parentNode.appendChild(clonedRow);
            container.querySelector(".weapons > tbody").appendChild(clonedRow);

        }
    };


    // This needs to be called whenever a player changes their type, whenever
    // a player is added, whenever a player is removed, and certainly whenever
    // the game difficulty or total point limit changes.
    this.updateRightPanel = function() {

        // Returns "1 light Bot", "3 medium Bots", or the like.
        let getClassReportPhrase = function(robotClass, quantity) {
            let suffix = (quantity == 1 ? "" : "s");
            return String.format("{0} {1} Bot{2}", quantity, robotClass, suffix);
        };

        // "Estimate" the forces of any computer players we currently have.
        // (In reality, we know exactly what their forces are -- after all, we
        // just asked 'em -- but we only relay this information to humans in
        // vague terms.)

        let cpuPlayers = 0;
        let dl = document.createElement("dl");
        let playerRows = container.querySelectorAll(".player-list .player.row");
        for (let i = 0; i < factions.length; ++i) {

            let playerIndex = findPlayerWithFactionIndex(i);
            if (playerIndex < 0) {
                // No player is assigned to this faction, CPU or otherwise.
                // Skip it.
                continue;
            }

            if (players[playerIndex].type !== "ai") {
                // Human forces don't need "estimates" -- you can see them all
                // right there on the left panel.
                continue;
            }

            // This faction has been confirmed to currently represent a CPU
            // player.
            cpuPlayers += 1;

            // We now obtain its actual force strength (I mean it -- we grab
            // the actual array of robots that the CPU will be playing with if
            // the game is started right now):

            let scoreSelect = container.querySelector(".points-section .points");
            let difficultySelect = container.querySelector(".difficulty-section .difficulty");
            let score = Number(scoreSelect.value);
            let multiplier = Number(difficultySelect.value);
            let robots = getComputerForces(factions[i], score, multiplier);

            // Count the number of Bots of each type.  We cheat here,
            // classifying heavy and assault Bots as a single category in
            // order to confuse the human players further.
            let buckets = { };
            let classesSeen = 0;
            for (let j = 0; j < robots.length; ++j) {
                let robotClass = robots[j].class;
                if (robotClass === "assault") {
                    robotClass = "heavy";
                }
                if (!(robotClass in buckets)) {
                    buckets[robotClass] = 0;
                    classesSeen += 1;
                }
                buckets[robotClass] += 1;
            }

            // Add this faction to the report.
            let dt = document.createElement("dt");
            dt.textContent = factions[i];
            dl.appendChild(dt);
            let dd = document.createElement("dd");
            let ul = document.createElement("ul");
            let counter = 0;
            for (let robotClass in buckets) {
                if (buckets[robotClass] == 0) {
                    continue;
                }
                counter += 1;
                let li = document.createElement("li");
                let reportPhrase = getClassReportPhrase(robotClass, buckets[robotClass]);

                // "Foo light mechs."
                // "Foo light mechs and bar medium mechs."
                // "Foo light mechs, bar medium mechs, and baz heavy mechs."
                switch (classesSeen) {
                    case 1:
                        li.textContent = String.format("{0}.", reportPhrase);
                        break;
                    case 2:
                        switch (counter) {
                            case 1:
                                li.textContent = String.format("{0} and", reportPhrase);
                                break;
                            default:
                                li.textContent = String.format("{0}.", reportPhrase);
                                break;
                        }
                        break;
                    default:
                        switch (counter) {
                            case 1:
                                li.textContent = String.format("{0},", reportPhrase);
                                break;
                            case 2:
                                li.textContent = String.format("{0}, and", reportPhrase);
                                break;
                            default:
                                li.textContent = String.format("{0}.", reportPhrase);
                                break;
                        }
                        break;
                }
                ul.appendChild(li);
            } // end (for each robot type in the CPU's robots for this difficulty level)
            dd.appendChild(ul);
            dl.appendChild(dd);
        } // end (for each faction)

        let estimates = container.querySelector(".estimates");

        if (cpuPlayers > 0) {

            container.querySelector(".danger").style.opacity = "1.0";
            container.querySelector(".danger").style.height = "auto";

            // The entirety of the "estimates" paragraph consists of this one <dl/> we have constructed.
            while (estimates.hasChildNodes()) {
                estimates.removeChild(estimates.lastChild);
            }
            estimates.appendChild(dl);

        } else {

            // The warning paragraph disappears since the human(s) can see the
            // strength of all the forces on the page.
            container.querySelector(".danger").style.opacity = "0.0";
            container.querySelector(".danger").style.height = "0";
        }
    };


    // Hide the Select-a-Mech™ screen.
    this.hide = function() {
        // It takes us 1 second to fade out.
        container.style.opacity = "0";
        window.setTimeout(function() {
            container.style.display = "none";
        }, 1000);
    };


    // Show the Select-a-Mech™ screen.
    //
    // See the comments for PlainView.show() if you're wondering where this
    // bizarre 1ms delay is coming from.
    this.show = function() {
        container.style.display = "block";
        window.setTimeout(function() {
            container.style.opacity = "1";
        }, 1);

        // BECAUSE this function is often (okay, usually) called after a game
        // has concluded, AND because we want the computer Bot choices to be
        // mixed up at the end of every game, AND because said mixing up has
        // already been done BUT the right panel is still the same as the way
        // it was at the start of the last game....
        //
        // Update the right panel.
        this.updateRightPanel();

        document.querySelector("head title").textContent = "B O T :: Selection Screen";
    };

    // Sets up the game controller using the CPU forces in getComputerForces()
    // and the human forces in the factionRobots[] array, disappears the
    // Select-a-Mech™ div, and starts the game.
    this.launchGame = function() {

        controller.resetGame();
        view.resetGame();
        let playingFactions = []; // Not all factions may have been assigned to a player!

        for (let i = 0; i < players.length; ++i) {

            let playingFaction = factions[players[i].factionIndex];
            playingFactions.push(playingFaction);
            let robots = [];

            // Update the controller's faction types to what the user chose.
            controller.setFactionType(playingFaction, players[i].type);

            // How we add the robots for the player depends on what type of
            // player they are.
            if (players[i].type === "human") {

                // factionRobots stores the human players' robot choices from
                // the left panel...as strings.
                let robotNames = factionRobots[players[i].factionIndex];
                for (let i = 0; i < robotNames.length; ++i) {
                    robots.push(new Robot(robotNames[i]));
                }

            } else if (players[i].type === "ai") {

                // getComputerForces() returns the Robot choices selected by
                // the AiPlayer for each difficulty and point quota that the
                // user experimented with.
                let scoreSelect = container.querySelector(".points-section .points");
                let difficultySelect = container.querySelector(".difficulty-section .difficulty");
                let score = Number(scoreSelect.value);
                let multiplier = Number(difficultySelect.value);
                robots = getComputerForces(playingFaction, score, multiplier);
            }

            // Register these robots with the GameController.
            for (let j = 0; j < robots.length; ++j) {
                controller.addRobot(playingFaction, robots[j]);
            }
        }

        // Clear the factionComputerForces.  That way, after the PlainView
        // returns to us when the current game is over, we'll come up with a
        // fresh challenge for our plucky human enemy.
        factionComputerForces = { };

        // We're ready to launch!
        //
        // GameController.startGame() takes an arbitrary number of faction
        // arguments.  To pass our playingFactions[] array into that, we use
        // Function.apply().
        controller.startGame.apply(controller, playingFactions);

        // Hide ourselves and show the game screen.
        that.hide();
        view.show();
        view.setBackdrop();

        // Add the robot divs to the view.
        for (let i = 0, robots = controller.getGameRobots(); i < robots.length;  ++i) {
            view.addRobot(robots[i]);
        }
        view.updateRobots();

        // There's a bug with an unknown cause right now: it only happens
        // after the completion of computer-only games, and it requires that
        // at least one player be human.
        //
        // The bug causes there to be no controller.getCurrentRobot(), so we
        // blow up.  This is because somehow the controller's
        // currentFactionIndex variable is undefined.
        //
        // Like most hairy bugs, this is difficult to reproduce.  We can work
        // around the bug, though, if we can just set that
        // currentFactionIndex.  But only two things set it:
        // GameController.startGame() and GameController.nextRobot().

        // Kick off turn #1.
        if (controller.getFactionType(controller.getCurrentRobot().faction) === "human") {
            // If it's a human's turn first, let them know.
            view.showNextDialogOrAdvanceTurn();
        } else {
            // If it's an AI, perform the move at once and pop up a dialog box to
            // wait for the user to continue.
            let aiPlayer = new AiPlayer(controller.getCurrentRobot().faction, controller, view);
            aiPlayer.playOneRound();
        }

        // That's it!  The dialog callbacks will take care of the rest.
    };

    // -----------------------------------------------------------------------
    // Final setup.

    // Every time the points are changed, the quotas must be updated anew and
    // the CPU player combat strength needs updating.
    container.querySelector(".points").onchange = function() {
        updatePlayerPointQuotas();
        that.updateRightPanel();
    };

    // Every time the difficultly is changed, the CPU player combat strength
    // needs updating.
    container.querySelector(".difficulty").onchange = this.updateRightPanel;

    // Clicking on the BIG BUTTON launches the game proper.
    container.querySelector(".go").onclick = this.launchGame;
    container.querySelector(".go").onkeydown = function(keyboardEvent) {
        switch (keyboardEvent.key) {
            case " ":
            case "Enter":
                this.launchGame();
                break;
        }
    };

    // Since we have two factions, add one row for each faction.  Make the
    // first one human and the second one a computer.
    createPlayerRows();
    createRobotRowLabels();
    setupRobotRowTemplate();

    this.addPlayerRowAtEnd();
    let firstPlayerRow = container.querySelector(".player-list .player.row:nth-of-type(1) .type");
    firstPlayerRow.value = "human";
    firstPlayerRow.onchange();

    this.addPlayerRowAtEnd();
    let secondPlayerRow = container.querySelector(".player-list .player.row:nth-of-type(2) .type");
    secondPlayerRow.value = "ai";
    secondPlayerRow.onchange();

    // Expose a few objects for debugging purposes.
    this.players = players;
    this.factionRobots = factionRobots;
    this.factionComputerForces = factionComputerForces;

    // this.updateCenterPanel("scarab"); // But then the center panel will never be blank!  Is that what I want?

    return this;
}
