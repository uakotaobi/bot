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

///////////////////////////////////////////////////////////////////
// Defines the Robot object and loads all the Robots statically. //
///////////////////////////////////////////////////////////////////

function Robot(robotType) {
    "use strict";

    // -----------------------------------------------------------------------
    // Private static data.

    // A hashtable that stores all robots by ID.
    if (!Robot.hasOwnProperty("robotTable")) {
        Robot.robotTable = { };
    }

    // Define the bots.
    //
    // The mass of the bot in metric tons is calculated from other available
    // statistics.
    //
    // TODO: Use the name "Galaxian" somewhere.  I've always imagined there's
    // a company called "Galaxian."  (And one called Ukulele.)
    if (!Robot.hasOwnProperty("dataTable")) {
        Robot.dataTable = {
            "invalid"        : {
                modelNumber  : "Ukulele UM1",          // Make and model number of bot.
                longName     : "Munchkin",             // Model name of bot.
                idPattern    : "No. [0-999999]",       // Template to use for unique IDs.  Leading zeroes matter.
                class        : "light",                // Bot class: light, medium, or heavy.
                arsenal      : ["invalid"],            // Weapons on the bot.
                hitpoints    : 1,
                armor        : "0d6",                  // Armor expression (evaluated like weapon damage expressions.)
                jump         : false,                  // Chance to jump for reduced damage when true.
                speed        : 1,                      // Determines turn order: higher = sooner.
                score        : 1,                      // Determines how many of these you can add to your forces
                image        : "./assets/images/bots/300px-tzunghaor - robot.png",
                description  : "<p>Although the UM1 is the pride and joy of Ukulele's new Armor Division, your average Scarab pilot could give four of these things a run for their money.</p><p>(You specified an <strong>invalid robotType</strong> for <code>new Robot()</code>, so you got this.  That's an error, and you should fix it.)</p>"
            },
            "invalid2"       : {
                modelNumber  : "Ukulele UM06",
                longName     : "Big Zero 6",
                idPattern    : "6.[000000-999999]",
                class        : "medium",
                arsenal      : ["invalid", "invalid", "invalid", "lightpulse", "lightpulse"],
                hitpoints    : 10,
                armor        : "1d20-1d10",
                jump         : false,
                speed        : 100,
                score        : 3,
                image        : "./assets/images/bots/700px-johnny_automatic and orru - robot color simply.png",
                description  : "<p>The UM06 is the Ukulele Armor Division's most dangerous machine to date.  Seriously, you could poke someone's eye out with this.</p>"
            },
            "hermes"         : {
                modelNumber  : "Stellar Shield 654",
                longName     : "Hermes",
                idPattern    : "[A-C][A-F][A-F][A-F]-[A-z][0-900]",
                class        : "light",
                arsenal      : ["mediumpulse", "lightlaser", "lightlaser"],
                hitpoints    : 15,
                armor        : "",
                jump         : true,
                speed        : 35,
                score        : 10,
                image        : "./assets/images/bots/350px-wildchief - Robot Walker.png",
                description  : "<p><strong>Speed</strong> is the 654's primary " +
                    " weapon.  Stellar Shield's proprietary fusion generator" +
                    " design gives Hermes units the crucial advantage of" +
                    " initiative in ground combat, and the embedded thrusters" +
                    " in their legs allow them to leap over" +
                    " obstacles and dodge attacks with ease.</p><p>These features" +
                    " come, unfortunately, at the cost of <strong>significant" +
                    " armor reduction</strong>.</p>"
            },
            "scarab"         : {
                modelNumber  : "Fujitsu F-109",
                longName     : "Scarab",
                idPattern    : "S2[A-B][A-C]-[0000-9999]-[00-99]",
                class        : "light",
                arsenal      : ["machinegun", "machinegun", "mediumlaser"],
                hitpoints    : 10,
                armor        : "",
                jump         : false,
                speed        : 30,
                score        : 5,
                image        : "./assets/images/bots/300px-killyoverdrive - Combat Android.png",
                description  : "<p>The affordable Scarab is designed for quick" +
                    " fights against light defenses using <strong>overwhelming" +
                    " numbers</strong>. Defense is <strong>not</strong> its" +
                    " strong suit, so make sure your pilots plan ahead.</p>"
            },
            "nomad"          : {
                modelNumber  : "Encom Series 300",
                longName     : "Nomad",
                idPattern    : "[100-999]-[A-Z][A-Z][A-Z][A-Z][A-Z]",
                class        : "medium",
                arsenal      : ["longrangemissile", "mediumlaser", "srm-nomad"],
                hitpoints    : 30,
                armor        : "2",
                jump         : false,
                speed        : 16,
                score        : 15,
                image        : "./assets/images/bots/500px-culturalibre - Nomad-Desert Mech.png",
                description  : "<p>With large feet, an armored frame, and a low" +
                    " center of gravity, Series 300 units are ideal for brief" +
                    " skirmishes over sandy terrain.  While the <strong>SRM" +
                    " A-model</strong> weapon boasts a significant punch, the" +
                    " Nomad chassis simply isn't robust enough to carry more" +
                    " than a handful of these shells for <strong>tactical" +
                    " purposes</strong>.</p>"
            },
            "stormcrow"      : {
                modelNumber  : "Genesis Robotics GM1550",
                longName     : "Stormcrow",
                idPattern    : "GM1550-[0001-9999][a-z]",
                class        : "medium",
                arsenal      : ["ac-stormcrow", "ac-stormcrow", "midrangemissile", "mediumlaser"],
                hitpoints    : 25,
                armor        : "",
                jump         : true,
                speed        : 25,
                score        : 20,
                image        : "./assets/images/bots/500px-edsonsantos - Mecha Warrior.png",
                description  : "<p>The Genesis Stormcrow's <strong>high" +
                    " speed</strong> and <strong>generous weapon" +
                    " complement</strong> make it a significant threat even" +
                    " during longer campaigns.</p>"
            },
            "bullfrog"       : {
                modelNumber  : "Edison Heavy Industries M5",
                longName     : "Bullfrog",
                idPattern    : "[50-59]:[100-999]-[10-99][a-b]",
                class        : "medium",
                arsenal      : ["heavylaser", "mortar", "lightpulse"],
                hitpoints    : 20,
                armor        : "",
                jump         : true,
                speed        : 20,
                score        : 25,
                image        : "./assets/images/bots/500px-Justin Nichol - Bullfrog.png",
                description  : "<p>Originally intended as scouting 'Bots," +
                    " Bullfrogs under the control of competent pilots rarely" +
                    " come in contact with solid ground. Each unit is equipped" +
                    " with a <strong>high-yield laser cannon</strong> that" +
                    " inflicts considerable damage at the cost of draining the" +
                    " regrettably small on-board combat capacitors.</p>"
            },
            "kraken"         : {
                modelNumber  : "Edison Heavy Industries M3",
                longName     : "Kraken",
                idPattern    : "[30-39]:[100-999]-[10-99][a-b]",
                class        : "heavy",
                arsenal      : ["ppc-kraken", "ppc-kraken", "mediumlaser", "mediumlaser"],
                hitpoints    : 40,
                armor        : "1d6",
                jump         : false,
                speed        : 10,
                score        : 30,
                image        : "./assets/images/bots/700px-Justin Nichol - Kraken.png",
                description  : "<p>The Kraken is, in effect, a walking" +
                    " <strong>Particle Projection Cannon</strong>.  Pilots" +
                    " facing these 'Bots in combat frequently report being" +
                    " fired upon long before establishing visual contact.</p>"
            },
            "kappa"          : {
                modelNumber  : "Edison Heavy Industries M20",
                longName     : "Kappa",
                idPattern    : "[200-209]:[100-999]-[10-99][a-b]",
                class        : "heavy",
                arsenal      : ["machinegun-kappa", "machinegun-kappa", "machinegun-kappa", "arc"],
                hitpoints    : 30,
                armor        : "1d4",
                jump         : true,
                speed        : 15,
                score        : 45,
                image        : "./assets/images/bots/700px-Justin Nichol - Kappa.png",
                description  : "<p>The Kappa is an unusual device.  In addition" +
                    " to its primary function as an armored support Bot, the" +
                    " Kappa's powerful rear-mounted turbines grant it both" +
                    " <strong>limited flight capability</strong> and" +
                    " <strong>amphibious travel</strong>.  On water worlds," +
                    " expect a Kappa attack from the sea.</p>"
            },
            "imp"            : {
                modelNumber  : "Edison Heavy Industries M11",
                longName     : "Imp",
                idPattern    : "[110-119]:[100-999]-[10-99][a-b]",
                class        : "heavy",
                arsenal      : ["cluster", "cluster", "cluster", "cluster", "ppc", "shortrangemissile"],
                hitpoints    : 40,
                armor        : "1d6",
                jump         : false,
                speed        : 9,
                score        : 40,
                image        : "./assets/images/bots/700px-Justin Nichol - Imp.png",
                description  : "<p>Few 'Bots are fast enough to escape the Imp's" +
                    " powerful <strong>cluster bomb barrage</strong> without" +
                    " sustaining heavy damage.  Imp pilots then pick off the" +
                    " casualties at their leisure with a mix of long- and" +
                    " short-range weaponry.</p>"
            },
            "charon"            : {
                modelNumber  : "Edison Heavy Industries M35",
                longName     : "Charon",
                idPattern    : "[350-359]:[100-999]-[10-99][a-b]",
                class        : "heavy",
                arsenal      : ["mediumlaser", "mediumlaser", "plasmagrenade", "heavymortar", "ac10"],
                hitpoints    : 45,
                armor        : "1d6",
                jump         : false,
                speed        : 10,
                score        : 40,
                image        : "./assets/images/bots/700px-Justin Nichol - Charon.png",
                description  : "<p>A note from the manufacturer: <q>The Charon is" +
                    " named for the legendary psychopomp of Greek mythology." +
                    " Like its namesake, it is <strong>expert</strong> at" +
                    " delivering souls to the <strong>land of the" +
                    " dead</strong>.</q></p>"
            },
            "executioner"    : {
                modelNumber  : "Genesis Robotics GM2900",
                longName     : "Executioner",
                idPattern    : "GM2900-[01-99][a-z]",
                class        : "assault",
                arsenal      : ["emf", "gauss", "mortar", "mortar"],
                hitpoints    : 50,
                armor        : "5",
                jump         : false,
                speed        : 5,
                score        : 60,
                image        : "./assets/images/bots/700px-piacenti - Robot.png",
                description  : "<p>The one redeeming grace about having to face" +
                    " Executioners in battle is that, contrary to popular" +
                    " belief, they are not as unstoppable as they seem." +
                    " However, it is absolutely true that most light weapons" +
                    " will <strong>barely make a dent</strong> in the GM2900's" +
                    " armor, and that its offensive capabilities are" +
                    " <strong>not to be trifled with</strong>.</p>"
            }
        };
    }


    if (!(robotType in Robot.dataTable)) {
        robotType = "invalid";
    }

    // -----------------------------------------------------------------------
    // Public static functions.

    // Returns the Robot having the given ID, or null if there is no such
    // robot.
    //
    // Changing a Robot's ID after construction will obviously break this
    // function (it will return null even though the robot exists.)  If you're
    // going to do that, unregister() the Robot first, change the Robot.id,
    // and then re-register.  You'll probably break the view, too (it doesn't
    // have a way to remove stale robot divs...yet.)
    //
    // Better yet, don't alter the ID.
    if (!(Robot.hasOwnProperty("findRobotById"))) {
        Robot.findRobotById = function(robotId) {
            return (robotId in Robot.robotTable ? Robot.robotTable[robotId] : null);
        };
    }

    // -----------------------------------------------------------------------
    // Private member functions (closure-local functions)

    let isEntirelyLowercase = function(s) { return (s.search(/[a-z]+/)  === 0); };
    let isEntirelyUppercase = function(s) { return (s.search(/[A-Z]+/)  === 0); };
    let isEntirelyLetters   = function(s) { return (s.search(/[a-z]+/i) === 0); };
    let isEntirelyDigits    = function(s) { return (s.search(/[0-9]+/)  === 0); };

    // Generates a random ID string that conforms to whatever ID pattern is
    // passed in as an argument.
    //
    // For the most part, characters within an ID pattern are copied verbatim
    // into the output string.  However, certain special constructions are
    // recognized within the ID pattern:
    //
    // * [N-M], where N and M are letters that have the same case.
    //
    //   This range string is replaced with a random character between N and
    //   M.
    //
    // * [N-M], where N and M are letters that have different cases.
    //
    //   Here, the replacement is a random letter between N, its corresponding
    //   "Z" of the same case, the "A" of the opposite case from that "Z", and
    //   M.  So, for instance, the range [v-E] is replaced with a random letter
    //   from the set { v, w, x, y, z, A, B, C, D, E }.
    //
    // * [X-Y] where X and Y are positive integers.
    //
    //   If neither number is zero-padded, the replacement is a random integer
    //   between X and Y.  If either X or Y are zero-padded, but not both,
    //   then the replacement number will also be zero-padded.  If both X and
    //   Y are zero-padded, the matching initial zeroes are copied to the
    //   output, chopped off, and then the new pattern is reinterpreted.
    //
    //   For instance, [1-100] does what you would expect it to do: generating
    //   a random integer between 1 and 100.  [001-100] also does what you
    //   would expect: generating a random integer between 1 and 100 and
    //   padding it with zeroes on the left so it is three digits long.  A
    //   stranger case might be [0005-75], which is equivalent to 00[05-75]
    //   (generating a random integer between 0005 and 0075), or [0008-09],
    //   which is equivalent to 000[8-9] and will give you either 0008 or
    //   0009.
    //
    // TODO: Support commas in order to select specific items rather than a
    // range, like {alpha,beta}[1-5][0-9].
    let createId = function(idPattern) {
        let result = "";
        for (let i = 0; i < idPattern.length; ++i) {
            let matchInfo = idPattern.substr(i).match(/\[([a-zA-Z0-9]+)-([a-zA-Z0-9]+)\]/i);
            if (matchInfo === null || matchInfo.index > 0) {
                // No [foo-bar] range pattern at present position.
                result += idPattern[i];
            } else {
                let left = matchInfo[1];
                let right = matchInfo[2];

                // We only understand [letter-letter] and [number-number].
                // - The former only permits single characters.  "[a-P]"
                //   selects a character between a-z or A-P at random.
                // - The latter permits numbers that have leading zeroes (like
                //   [001-999]) or numbers that do not (like [1-999].)
                if (isEntirelyLetters(left) && isEntirelyLetters(right) &&
                    left.length === 1 && right.length === 1) {

                    let leftCharCode = left.charCodeAt(0);
                    let rightCharCode = right.charCodeAt(0);
                    let possibleCharacters = "";

                    if ((isEntirelyLowercase(left) && isEntirelyLowercase(right)) ||
                        (isEntirelyUppercase(left) && isEntirelyUppercase(right))) {

                        // Cases are the same, so the range is trivial
                        // (there is no ASCII punctuation to skip.)

                        for (let minCharCode = Math.min(leftCharCode, rightCharCode),
                                 maxCharCode = Math.max(leftCharCode, rightCharCode),
                                 charCode = minCharCode;
                             charCode <= maxCharCode;
                             ++charCode) {
                            possibleCharacters += String.fromCharCode(charCode);
                        }
                    } else {
                        // Cases differ!
                        // "y-F" means possibleCharacters should be "yzABCDEF".
                        // "F-y" means possibleCharacters should be "FGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxy".
                        // "Y-f" means possibleCharacters should be "YZabcdef".
                        // "f-Y" means possibleCharacters should be "fghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY".

                        let leftFinalCharCode = (isEntirelyLowercase(left) ? "z".charCodeAt(0) : "Z".charCodeAt(0));
                        let rightInitialCharCode = (isEntirelyLowercase(right) ? "a".charCodeAt(0) : "A".charCodeAt(0));
                        for (let charCode = leftCharCode; charCode <= leftFinalCharCode; ++charCode) {
                            possibleCharacters += String.fromCharCode(charCode);
                        }
                        for (let charCode = rightInitialCharCode; charCode <= rightCharCode; ++charCode) {
                            possibleCharacters += String.fromCharCode(charCode);
                        }
                    }
                    // console.log("createId(): Range " + matchInfo[0] + " has these" +
                    //             " possible characters: " + possibleCharacters);

                    let max = possibleCharacters.length - 1;
                    let min = 0;
                    let randomIndex = Math.floor(Math.random() * (max - min + 1)) + min;
                    let randomCharacter = possibleCharacters[randomIndex];

                    result += randomCharacter;

                } else if (isEntirelyDigits(left) && isEntirelyDigits(right)) {

                    // Do they both begin with leading zeroes?  Because if so,
                    // we'll just insert that many zeroes and skip the leading
                    // zeroes.
                    let j = 0;
                    let minLength = Math.min(left.length, right.length);
                    while (j < minLength && left[j] === "0" && right[j] === "0")
                    {
                        result += "0";
                        j += 1;
                    }
                    if (j == minLength) {
                        // The range is something like "[0-099]", and since
                        // we've inserted the leading zeroes, we now have
                        // "[-99]".  That's meaningless, but we can charitably
                        // interpret the caller's original intention as
                        // "[000-099]".

                        let maxLength = Math.max(left.length, right.length);
                        let padding = "";
                        while (j++ < maxLength) {
                            padding += "0";
                        }
                        if (left.length === minLength) {
                            left = padding;
                            right = right.substr(minLength);
                        } else {
                            left = left.substr(minLength);
                            right = padding;
                        }
                    } else {
                        // The range is something like "[05-099]".  Just skip
                        // the common padding characters so we're dealing with
                        // "[5-99]".
                        left = left.substr(j);
                        right = right.substr(j);
                    }

                    // If one of the two numbers still has leading zeroes,
                    // we'll zero-pad the random number we come up with.
                    // Otherwise, we won't.
                    let zeroPad = ((left.length > 1 && left[0] === "0" ) ||
                                   (right.length > 1 && right[0] === "0") ? true : false);
                    let l = Number(left);
                    let r = Number(right);
                    let min = Math.min(l, r);
                    let max = Math.max(l, r);
                    let randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

                    if (zeroPad) {
                        let minLength = Math.min(left.length, right.length);
                        let maxLength = Math.max(left.length, right.length);
                        for (let j = String(randomNumber).length; j < maxLength; ++j) {
                            result += "0";
                        }
                    }
                    result += randomNumber;

                } else {
                    // Bad range.
                    console.log("createId(): Invalid range '" + matchInfo[0] +
                                "' at position " + (i+1) + " of ID pattern '" + idPattern +
                                "': left and right side of range must both be " +
                                "either single letters or positive integers.");
                }
                // Skip this range pattern.
                i += (matchInfo[0].length - 1);

            } // end (if we saw a [foo-bar] range pattern within the ID pattern)
        } // end (for each character in the ID pattern)
        return result;
    };


    // -----------------------------------------------------------------------
    // Public static member functions.


    // Returns the list of all currently-registered Robot objects.
    if (!Robot.hasOwnProperty("list")) {
        Robot.list = function() { return Robot.robotTable; };
    }


    // Preload the images for all of the game's robots in an off-screen div.
    // The div is removed once all the images are loaded.
    if (!Robot.hasOwnProperty("preloadImages")) {
        Robot.preloadImages = function() {

            let startTimeMilliseconds = Date.now();
            let robotImages = [];

            for (let internalName in Robot.dataTable) {
                let imagePath = Robot.dataTable[internalName].image;
                let img = new Image();
                img.src = imagePath;
                robotImages.push(img);
            }

            // This function's only purpose is to let me know how long the
            // robots took to load on your client (to within 500 milliseconds
            // of accuracy.)
            let checkRobotImagePreloadingProgress = function() {
                let loadedImages = 0;
                for (let i = 0; i < robotImages.length; ++i) {
                    if (robotImages[i].complete) {
                        ++loadedImages;
                    }
                }

                if (loadedImages < robotImages.length) {
                    window.setTimeout(checkRobotImagePreloadingProgress, 100);
                } else {

                    // If control makes it here, all the images are loaded.
                    console.debug("Robot.preloadImages/checkRobotImagePreloadingProgress(): All %d robot image(s) loaded in %.2f seconds.",
                                  loadedImages,
                                  (Date.now() - startTimeMilliseconds)/1000.0);
                }
            };

            window.setTimeout(checkRobotImagePreloadingProgress, 100);
        };
    }


    // -----------------------------------------------------------------------
    // Public member variables the caller can manipulate.


    this.modelNumber = Robot.dataTable[robotType].modelNumber;
    this.longName    = Robot.dataTable[robotType].longName;
    this.class       = Robot.dataTable[robotType].class;

    // Fill the arsenal with actual Weapon objects.
    this.arsenal = [];
    for (let i = 0; i < Robot.dataTable[robotType].arsenal.length; ++i) {
        this.arsenal.push(new Weapon(Robot.dataTable[robotType].arsenal[i]));
    }

    this.hitpoints   = Number(Robot.dataTable[robotType].hitpoints);
    this.armor       = Robot.dataTable[robotType].armor;
    this.jump        = Boolean(Robot.dataTable[robotType].jump);
    this.speed       = Robot.dataTable[robotType].speed;
    this.score       = Number(Robot.dataTable[robotType].score);
    this.image       = Robot.dataTable[robotType].image;
    this.description = Robot.dataTable[robotType].description;

    this.internalName      = robotType;      // Just in case we need it.
    this.originalHitpoints = this.hitpoints; // For health bars and the like.

    // -----------------------------------------------------------------------
    // Public member functions.

    // Is this robot in the global robot table?
    this.registered = function() { return (Robot.robotTable.hasOwnProperty(this.id)); };


    // Registers this robot in the global robot table.
    //
    // Returns true if the registration was successful, and false if there was
    // something there already.
    this.register = function() {
        if (this.registered()) {
            return false;
        }
        Robot.robotTable[this.id] = this;
        return true;
    };


    // Unregisters this robot from the global robot table.
    //
    // Returns true if unregistration was successful, and false if there was
    // nothing to unregister.
    this.unregister = function() {
        if (!this.registered()) {
            return false;
        }
        delete Robot.robotTable[this.id];
        return true;
    };


    // Returns an array containing all of the Weapon objects in our arsenal
    // array which match the given internalName, shortName, or longName, AND
    // which still have enough ammo to be fired.
    this.findWeapons = function(weaponName) {
        let result = [];
        weaponName = weaponName.toLowerCase();
        for (let i = 0; i < this.arsenal.length; ++i) {
            if ((this.arsenal[i].internalName.toLowerCase() === weaponName ||
                 this.arsenal[i].shortName.toLowerCase()    === weaponName ||
                 this.arsenal[i].longName.toLowerCase()     === weaponName) &&
                this.arsenal[i].ammo >= this.arsenal[i].ammoPerRound) {

                result.push(this.arsenal[i]);
            }
        }
        return result;
    };


    // Returns true if we can still fire at least one weapon.
    //
    // Most 'Bots have at least one weapon with limitless ammunition
    // (ammoPerRound === 0.)  Those bots will always return true here.
    this.hasAmmo = function() {
        for (let i = 0; i < this.arsenal.length; ++i) {
            let weapon = this.arsenal[i];
            if (weapon.ammo >= weapon.ammoPerRound) {
                return true;
            }
        }
        return false;
    };


    // Fires ALL weapons from this robot's arsenal having the given (internal,
    // short, or long) name at the given target Robot.  What is returned is a
    // damage report object with the following fields:
    //
    // - originalDamage: A damageObject representing the amount of damage that
    //                   the enemy robot *would* have taken from firing our
    //                   weapon, if there were no other intervening factors.
    //
    // - jumped: True if the robot jumped and false if it didn't.
    //
    // - jumpDamage: A damageObject which represents the amount of damage the
    //               robot avoided by jumping.  The damageObject's rolls
    //               array will have a single 1d10 in it representing the jump
    //               roll itself.
    //
    //               There is a small (currently 10%) chance of taking partial
    //               damage from a jump by not dodging in time.  To detect
    //               this, check to see if damageReport.finalDamage > 0 &&
    //               damageReport.jumped === true.
    //
    // - armorDamage: A DamageObject representing the amount of damage that
    //                the robot avoided due to armor.
    //
    // - finalDamage: The sum total damage that the target robot took -- that
    //                is, originalDamage.damage - jumpDamage.damage -
    //                armorDamage.damage.  If it's less than 0, it will be set
    //                to 0.
    //
    // If updateRobots is true (the default), then this function updates our
    // arsenal and the defendingRobot's hitpoints as a side effect.  And yes,
    // this does mean the defendingRobot's hitpoints can become negative.
    //
    // If you attempt to fire a weapon that's out of ammo, it will deal 0
    // damage, but you'll still get a damage report.
    //
    // NB: It took some convincing, but I now know that infix operand order is
    // preserved in a converted prefix or postfix expression.  That's great
    // for us: it means the order of dice in the rolls array is the same as it
    // would have been in the infix array, and thus we can print out the infix
    // expression, replacing each occurrence of "1dFoo" with rolls[i++], and
    // the formula for damage will remain accurate!  That's what we'll display
    // in the graphical damage report.

    this.fire = function(defendingRobot, attackerWeaponName, damageType, updateRobots) {
        if (damageType === undefined) {
            damageType = Weapon.useRandomValues;
        }
        if (updateRobots === undefined) {
            updateRobots = true;
        }

        let damageReport = {
            originalDamage: {
                damageString: "",
                damage: 0,
                rolls: []
            },
            jumped: false,
            jumpDamage: {
                damageString: "",
                damage: 0,
                rolls: []
            },
            armorDamage: {
                damageString: "",
                damage: 0,
                rolls: []
            },
            finalDamage: 0
        };

        let matchingWeapons = this.findWeapons(attackerWeaponName);

        // Out of ammo?  Weapon doesn't exist?
        if (matchingWeapons.length === 0) {
            console.warn(String.format("Robot.fire(): {0} {1} cannot shoot '{2}' weapon because it does not exist in the {0}'s arsenal or because it is out of ammo.",
                                       this.longName,
                                       this.id,
                                       attackerWeaponName));
            return damageReport;
        }

        // Update the arsenal by firing all the matching weapons, but...!  We
        // discard those rolls!
        if (updateRobots) {
            for (let i = 0; i < matchingWeapons.length; ++i) {
                let unusedDamageReport = matchingWeapons[i].fire();
            }
        }

        // Here's why: we create a new damageString that combines the strength
        // of all those weapons together, and then we fire THAT!
        let combinedDamageString = Weapon.getCombinedDamageString(matchingWeapons[0].damage, matchingWeapons.length);
        damageReport.originalDamage = Weapon.calculateDamage(combinedDamageString, damageType);

        // Can the defender dodge it?
        if (defendingRobot.jump) {
            switch (damageType) {
                case Weapon.useRandomValues:
                {
                    const jumpRollString = "1d10";
                    let jumpDamageObject = Weapon.calculateDamage(jumpRollString, damageType);
                    damageReport.jumpDamage.rolls = jumpDamageObject.rolls;
                    damageReport.jumpDamage.damageString = jumpRollString;

                    if (jumpDamageObject.rolls[0].value <= 4) {
                        // You made it!  All damage prevented.
                        damageReport.jumped = true;
                        damageReport.jumpDamage.damage = damageReport.originalDamage.damage;
                    } else if (jumpDamageObject.rolls[0].value == 5) {
                        // Partial dodge.  50% of the damage was prevented.
                        damageReport.jumped = true;
                        damageReport.jumpDamage.damage = damageReport.originalDamage.damage * 0.5;
                    } else {
                        // You didn't make it.  Full damage taken.
                        damageReport.jumped = false;
                        damageReport.jumpDamage.damage = 0;
                    }
                    break;
                }
                case Weapon.useExpectedValues:
                    // A 40% chance of taking no damage +
                    // A 10% chance of taking half damage +
                    // A 50% chance of taking full damage
                    //
                    // Leads to an expected value of 0.4 * 0 + 0.1 * 0.5 + 0.5 * 1
                    // = 55% damage taken after the average jump (i.e., 45% damage
                    // prevented by the average jump.)
                    let percentDamageTakenWithJumping = (0.40 * 0) + (0.10 * 0.5) + (0.5 * 1);
                    damageReport.jumped = true;
                    damageReport.jumpDamage.damage = (1 - percentDamageTakenWithJumping) * damageReport.originalDamage.damage;
                    break;
                case Weapon.useMinimumValues:
                    // Taking minimum damage means the jump always succeeds.
                    damageReport.jumped = true;
                    damageReport.jumpDamage.damage = damageReport.originalDamage.damage;
                    break;
                case Weapon.useMaximumValues:
                    // Taking maximum damage requires jumps to always fail.
                    damageReport.jumped = false;
                    damageReport.jumpDamage.damage = 0;
                    break;
                default:
                    // Shouldn't make it here.
                    console.log("Weapon.fire(): Error: Unrecognized damage type " +
                                damageType + ".");
                    return { originalDamage: { damageString: "", damage: 0, rolls: [] },
                             jumped: false,
                             jumpDamage: { damageString: "", damage: 0, rolls: [] },
                             armorDamage: { damageString: "", damage: 0, rolls: [] },
                             finalDamage: 0 };

            } // end (switch on damage type)
        } // end (if the defender can jump)

        // Did the defender's armor (if any) protect it?
        switch (damageType) {
            case Weapon.useRandomValues:
                damageReport.armorDamage = Weapon.calculateDamage(defendingRobot.armor, damageType);
                break;
            case Weapon.useExpectedValues:
                if (!defendingRobot.jump) {
                    // Straightforward.
                    damageReport.armorDamage = Weapon.calculateDamage(defendingRobot.armor, damageType);
                } else {
                    // If you can jump, the expected value of armor prevention
                    // is more complicated: 40% of the time, armor prevention
                    // does not apply (since you jumped and prevented all
                    // damage anyway.)  50% of the time, the jump fails and
                    // armor prevention applies in full.  The other 10% of the
                    // time, jumping succeeds and armor prevention is applied
                    // (to half the original damage.  But that still counts as
                    // armor applying!)
                    //
                    // The expected damage prevented due to armor when the
                    // robot can also jump is therefore (0.40 * 0) + (0.50 *
                    // 1) + (0.10 * 1) = 60% of the originally expected armor
                    // roll.
                    let averageDamagePreventedByArmor = Weapon.calculateDamage(defendingRobot.armor, damageType);
                    damageReport.armorDamage.damage = 0.60 * averageDamagePreventedByArmor.damage;
                }
                break;
            case Weapon.useMinimumValues:
                // To take the smallest damage, we need the biggest armor
                // bonus.
                damageReport.armorDamage = Weapon.calculateDamage(defendingRobot.armor, Weapon.useMaximumValues);
                break;
            case Weapon.useMaximumValues:
                // Similarly, to take the most damage, we need the smallest
                // armor bonus.
                damageReport.armorDamage = Weapon.calculateDamage(defendingRobot.armor, Weapon.useMinimumValues);
                break;
            default:
                // Shouldn't make it here.
                console.log("Robot.fire(): Error: Unrecognized damage type " +
                            damageType + ".");
                return { originalDamage: { damageString: "", damage: 0, rolls: [] },
                         jumped: false,
                         jumpDamage: { damageString: "", damage: 0, rolls: [] },
                         armorDamage: { damageString: "", damage: 0, rolls: [] },
                         finalDamage: 0 };
        }


        // Calculate the final damage.  Always round damage prevention down to
        // favor the attacker.
        let damagePrevented = Math.floor(damageReport.jumpDamage.damage) + Math.floor(Math.max(0, damageReport.armorDamage.damage));
        damageReport.finalDamage = Math.max(0, damageReport.originalDamage.damage - damagePrevented);
        if (updateRobots) {
            defendingRobot.hitpoints -= damageReport.finalDamage;
        }

        return damageReport;
    };

    // -----------------------------------------------------------------------
    // Try to find an ID which is unique, then register the bot.
    const idPattern = Robot.dataTable[robotType].idPattern;
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; ++attempt) {
        this.id = createId(idPattern);
        if (this.register()) {
            break;
        }
    }

    // If the attempt fails after 100 tries, your ID pattern sucks.
    if (!this.registered()) {
        console.log("Robot(): Internal error: made " + maxAttempts +
                    " attempts to register this new " + robotType + "in the" +
                    " Robot.robotTable, but the IDs just weren't unique" +
                    " enough.  Please increase the complexity of the ID" +
                    " pattern (currently \"" + idPattern + "\").");
    }

    return this;
}

(function() {
    let r = new Robot(); // Force the dataTable to poof into existence.
    r.unregister();
}());
