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

///////////////////////////////////////////////////////////////////////////////////
// A class whose only purpose is to start the game.  The GameController does the //
// rest of the work.                                                             //
///////////////////////////////////////////////////////////////////////////////////

function Game() {

    let controller = new GameController();
    let view = new PlainView(controller, null, "game-log");

    let playerFaction = "The Star Alliance";
    let player2Faction = "The Rebels";
    let aiFaction = "The Prime Edict";
    let player3Faction = "The Machinists' Guild";

    // The player selection screen will automatically default to making the
    // first player a human belonging to faction #0 and the second player a
    // computer belonging to faction #1.
    controller.addFaction(playerFaction,  true,  "human", "./assets/images/icons/[CC-BY-3.0] jreijonen - Faction symbols (allies & axis) (star_0_0) [OpenGameArt]-512px.png");
    controller.addFaction(aiFaction,      true,  "ai",    "./assets/images/icons/[CC-BY-SA-3.0] Myckel - 6 Sci-Fi symbols (sci-fi_symbols) [OpenGameArt]-%235.png");
    controller.addFaction(player2Faction, false, "human", "./assets/images/icons/[PD] ENTREPRENEUR - Torn flag (torn-flag) [OpenClipArt].png");
    controller.addFaction(player3Faction, true,  "human", "./assets/images/icons/world-gear-grid-icon.png");

    // The Select object depends on the controller's current faction
    // assignments, which we just took care of above.
    //
    // It also alters the DOM to create player rows for each possible faction,
    // and deletes stuff too, so it's really better if there's only ever one
    // of these.
    let select = new Select(controller, view);


    // -----------------------------------------------------------------------
    // Public functions.


    // Invokes a game "by hand" without going through the selection screen.
    // This allows for testing bots in contrived scenarios.
    //
    // That's why this function looks so dirty, and why there's no need to
    // clean it up.
    this.launchTestGame = function() {

        controller.resetGame();
        view.resetGame();
        let aiBotNames = [
            //        "kappa", "scarab", "munchkin", "munchkin", "stormcrow"
            "bullfrog",    "charon", "kraken", "imp"
        ];
        let humanBotNames = [
            //        "charon", "imp", "nomad", "nomad", "nomad"
            "invalid2", "hermes", "munchkin", "invalid2", "invalid2", "executioner"
        ];

        let aiBots = [];
        let humanBots = [];
        for (let i = 0; i < aiBotNames.length; ++i) {
            let bot = new Robot(aiBotNames[i]);
            aiBots.push(bot);
            controller.addRobot(aiFaction, bot);
        }
        for (let i = 0; i < humanBotNames.length; ++i) {
            let bot = new Robot(humanBotNames[i]);
            humanBots.push(bot);
            controller.addRobot(playerFaction, bot);
        }

        //let a = new Robot(); a.jump = true; a.armor = "1+(1d4-(1+1d5))"; a.arsenal[0].damage="1d20";a.arsenal[0].ammo=10;

        controller.startGame(playerFaction, aiFaction);
        view.setBackdrop();

        // Now that the game has an official robot list, create the robot divs,
        // then adjust their sizes.
        for (let i = 0, robots = controller.getGameRobots();
             i < robots.length;
             ++i) {
            view.addRobot(robots[i]);
        }
        view.updateRobots();


        if (controller.getFactionType(controller.getCurrentRobot().faction) === "human") {
            // If it's a human's turn first, let them know.
            view.showNextDialogOrAdvanceTurn();
        } else {
            // If it's an AI, perform the move at once and pop up a dialog box to
            // wait for the user to continue.
            let aiPlayer = new AiPlayer(controller, view);
            aiPlayer.playOneRound();
        }
    };


    // Hides our view and shows the selection screen instead.  Surprisingly
    // simple for such an important function.
    //
    // TODO: Should we call a function to reset anything, or is it okay to
    // just leave it the way it was?
    this.launchSelectScreen = function() {
        view.hide();
        select.show();
    };


    this.controller = function() { return controller; };
    this.view = function() { return view; };
    this.select = function() { return select; };

    // Sprites have:
    //   * You can also get the current x and y within that image (useful only
    //     for sprite sheets.)
    // - The ability to update themselves using setTimeout() if they are
    //   animated.
    //   * This update can also ask the view to redraw just the sprite post-update.
    // - An originalWidth and originalHeight.
    // - a width and height. (The current ones.)
    // - SetWidth() and setHeght() to preserve the aspect ratio.
    // - Setdimensions() to stretch.
    // - You can always use percentages in these functions: they mean "percent
    //   of the current width" or "percent of the current height" depending on
    //   which argument you passed the percentage into.
    //
    // DamageSprite is just a special sprite that prints a number that rises
    // upward and fades to nothing.
    //
    // Sprites have update() methods that are called by the PlainView's
    // requestAnimationFrame callback, so the sprite can move, fade, or the
    // like when needed.

    return this;
}
