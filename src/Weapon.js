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

function Weapon(weaponType) {
    "use strict";

    // -----------------------------------------------------------------------
    // Private static data.

    // Define the weapons.
    let dataTable = {
        "invalid"          : {
            longName       : "Giant Slingshot", // Full name of weapon.
            shortName      : "SLING",           // Short name for display.
            class          : "light",           // Weapon class: light, medium, or heavy.
            damage         : "1d2*1d3*1d4",     // Damage expression (see Weapon.calculateDamage().)
            explosion      : "blast-lrm",       // Optional PlainView.explode() explosion type for a successful hit
            duration       : 1000,              // Optional duration of the explosion, in milliseconds (default is 1000)
            ammoPerRound   : 1,                 // Bullets consumed with each shot.
            ammo           : 2                  // Number of bullets.
        },
        "machinegun"       : {
            longName       : "Machine Gun",
            shortName      : "MACH. GUN",
            class          : "medium",
            damage         : "1d7", // EV=4, but used in sets of 2 for 8
            explosion      : "blast-machinegun-light",
            duration       : 1500,
            ammoPerRound   : 10,
            ammo           : 200
        },
        "machinegun-kappa" : {
            longName       : "Machine Gun",
            shortName      : "MACH. GUN",
            class          : "heavy",
            damage         : "1d5", // EV=3, but used in sets of 3 for 9
            explosion      : "blast-machinegun-medium",
            duration       : 1000,
            ammoPerRound   : 10,
            ammo           : 150
        },
        "lightlaser"       : {
            longName       : "Light Laser",
            shortName      : "LT. LASER",
            class          : "light",
            damage         : "3", // EV=3
            ammoPerRound   : 0,
            ammo           : 1
        },
        "mediumlaser"      : {
            longName       : "Medium Laser",
            shortName      : "MD. LASER",
            class          : "light",
            damage         : "2d4", // EV=5
            ammoPerRound   : 0,
            ammo           : 1
        },
        "heavylaser"       : {
            longName       : "Heavy Laser",
            shortName      : "HV. LASER",
            class          : "heavy",
            damage         : "2d9", // EV=10, making it a bit less powerful than the srm-nomad
            ammoPerRound   : 0,
            ammo           : 1
        },
        "srm-nomad"        : {
            longName       : "Short-Range Missile, Model A",
            shortName      : "SRM/A",
            class          : "heavy",
            damage         : "1d20", // EV=10.5, but with all extremes to be expected
            explosion      : "blast-srm-nomad",
            duration       : 2000,
            ammoPerRound   : 1,
            ammo           : 3
        },
        "shortrangemissile": {
            longName       : "Short-Range Missile, Model B",
            shortName      : "SRM/B",
            class          : "heavy",
            damage         : "3d6", // EV=10.5, but with the average being more common
            explosion      : "blast-srm",
            duration       : 2500,
            ammoPerRound   : 1,
            ammo           : 12
        },
        "midrangemissile"  : {
            longName       : "Mid-Range Missile",
            shortName      : "MRM",
            class          : "medium",
            damage         : "2d6", // EV=7
            explosion      : "blast-mrm",
            duration       : 2000,
            ammoPerRound   : 1,
            ammo           : 20
        },
        "longrangemissile" : {
            longName       : "Long-Range Missile",
            shortName      : "LRM",
            class          : "light",
            damage         : "1d6 + 2", // EV=5.5
            explosion      : "blast-lrm",
            duration       : 1500,
            ammoPerRound   : 1,
            ammo           : 30
        },
        "ac-stormcrow"     : {
            longName       : "Autocannon 20-pack",
            shortName      : "AC/20",
            class          : "medium",
            damage         : "(1d2 * 2d2) + (1d2 * 2d2)", // EV=9
            explosion      : "blast-ac-medium",
            duration       : 2500,
            ammoPerRound   : 1,
            ammo           : 20
        },
        "ac10"             : {
            longName       : "Autocannon 10-pack",
            shortName      : "AC/10",
            class          : "heavy",
            damage         : "(1d2 * 1d6) + (1d2 * 1d6)", // EV=10.5, same as a 3D6!
            explosion      : "blast-ac-heavy",
            duration       : 5000,
            ammoPerRound   : 1,
            ammo           : 10
        },
        "ac5"             : {
            longName       : "Autocannon 5-pack",
            shortName      : "AC/5",
            class          : "assault",
            damage         : "(1d3 * 1d6) + (1d4 * 1d5)", // EV=14.5, stronger than the Gauss Gun
            explosion      : "blast-ac-assault",
            duration       : 3500,
            ammoPerRound   : 1,
            ammo           : 5
        },
        "lightpulse"       : {
            longName       : "Light Pulse Laser",
            shortName      : "LT. PULSE",
            class          : "light",
            damage         : "1 + 2d2", // EV=4, slightly better than a lightlaser
            ammoPerRound   : 0,
            ammo           : 1
        },
        "mediumpulse"      : {
            longName       : "Medium Pulse Laser",
            shortName      : "MD. PULSE",
            class          : "medium",
            damage         : "1 + 1d12", // EV=7.5, better than the mortar on average (but with lower max damage)
            ammoPerRound   : 1,
            ammo           : 15
        },
        "heavypulse"      : {
            longName       : "Heavy Pulse Cannon",
            shortName      : "HV. PULSE",
            class          : "assault",
            damage         : "1 + (1d8*1d5)", // EV=14.5, same as the 2x mortar (but with a slightly higher probability of dealing max damage)
            ammoPerRound   : 1,
            ammo           : 6
        },
        "mortar"           : {
            longName       : "Mortar Cannon",
            shortName      : "MORTAR",
            class          : "medium",
            damage         : "1 + (1d4*1d4)", // EV=just 7.25, a wee bit better than 2D6.  But 2 of them together are better than a Gauss Gun!
            ammoPerRound   : 1,
            ammo           : 6
        },
        "heavymortar"      : {
            longName       : "High-Yield Mortar Cannon",
            shortName      : "H. MORTAR",
            class          : "heavy",
            damage         : "2 + (1d5)^2", // Scary, but the EV is only 11.
            ammoPerRound   : 1,
            ammo           : 5
        },
        "thermaldetonator" : {
            longName       : "G2150 Thermal Detonator",
            shortName      : "DETONATOR",
            class          : "heavy",
            damage         : "1d2 + 1d12 + (1d4)^2", // EV is 14.25, just a bit less than the AC/5.
            ammoPerRound   : 1,
            ammo           : 5
        },
        "ppc"              : {
            longName       : "Particle Projection Cannon",
            shortName      : "PPC",
            class          : "heavy",
            damage         : "6 + 1d6", // EV=9.5
            ammoPerRound   : 0,
            ammo           : 1
        },
        "ppc-kraken"       : {
            longName       : "Particle Projection Cannon Dual",
            shortName      : "PPC",
            class          : "heavy",
            damage         : "1 + 1d8", // EV=5.5, best used in pairs.
            ammoPerRound   : 1,
            ammo           : 20
        },
        "arc"              : {
            longName       : "Disruptor Beam",
            shortName      : "D. BEAM",
            class          : "medium",
            damage         : "15 - 2d6", // EV=8
            ammoPerRound   : 0,
            ammo           : 1
        },
        "plasmagrenade"    : {
            longName       : "Plasma Grenade",
            shortName      : "P. GRENADE",
            class          : "heavy",
            damage         : "3d8", // EV=13.5, just a bit better than the EMF
            ammoPerRound   : 1,
            ammo           : 4
        },
        "cluster"          : {
            longName       : "Cluster Bomb Battery",
            shortName      : "CLUSTER",
            class          : "heavy",
            damage         : "7d2 - 4", // EV=6.5, but used in packs of 2 for 13.
            explosion      : "blast-cluster",
            duration       : 3000,
            ammoPerRound   : 7,
            ammo           : 35
        },
        "gauss"            : {
            longName       : "Gauss Gun",
            shortName      : "GAUSS",
            class          : "assault",
            damage         : "4d6", // EV=14; stronger than the EMF (and the 3d8 Plama Grenade.)
            ammoPerRound   : 1,
            ammo           : 5
        },
        "emf"              : {
            longName       : "Electromagnetic Flare Gun",
            shortName      : "EMF",
            class          : "heavy",
            damage         : "1d6*1d6", // EV=12.25: less intimidating than it looks, but with limitless ammo.
            ammoPerRound   : 0,
            ammo           : 1
        },
        "emp"              : {
            longName       : "Electromagnetic Pulse Bomb",
            shortName      : "EMP",
            class          : "assault",
            damage         : "3d2*3d2", // EV=20.25, with a high probability of dealing the average damage.
            ammoPerRound   : 1,
            ammo           : 1
        },
        "railgun"          : {
            longName       : "Atomic Railgun",
            shortName      : "RAIL",
            class          : "assault",
            damage         : "25 * (1d6/3)", // EV=26.167.  The maximum damage is pretty devastating, but you get just one shot.
            ammoPerRound   : 1,
            ammo           : 1
        }
    };


    if (!(weaponType in dataTable)) {
        weaponType = "invalid";
    }

    // -----------------------------------------------------------------------
    // Private member functions (closure-local functions.)

    // Helper function for calculateDamage().  Given a damage string and an
    // index, return the next valid token need at or after that index.
    // Whitespace is ignored.
    let getNextToken = function(s, index) {

        // It's no EBNF grammar, but it'll do.
        const tokenPatterns = {
            leftParen:  /\(/,
            rightParen: /\)/,
            dice:       /[0-9]+d[0-9]+/i,  // Must be matched before integer
            integer:    /(\+|-)?[0-9]+/,   // Must be matched before plus or minus
            plus:       /\+/,
            times:      /\*/,
            minus:      /-/,
            divide:     /\//,
            exponent:   /\^/
        };

        let str = s.substr(index).trim();
        for (let k in tokenPatterns) {
            if (!tokenPatterns.hasOwnProperty(k)) {
                continue;
            }
            let matchInfo = str.match(tokenPatterns[k]);
            if (matchInfo === null || matchInfo.index > 0) {
                continue;
            }

            // Special casing for signed integers: IFF we're immediately
            // preceded by an integer, then we actually only matched the + or
            // - sign instead of the whole thing.
            //
            // In other words, "2D5-8" with the index on the "-" should be
            // parsed as "2d5", "-", "8", not "2d5", "-8".
            //
            // I wouldn't need to do this if JavaScript supported negative
            // lookbehind regexes.  But it doesn't!
            if (k === "integer" &&
                (str[0] === "-" || str[0] == "+") &&
                index > 0 &&
                s[index - 1].search(/[0-9]/) === 0) {

                return { token: str[0],
                         index: (s.length - str.length),
                         type: (str[0] === "-" ? "minus" : "plus") };
            }

            return { token: matchInfo[0].toLowerCase(),
                     index: (s.length - str.length),
                     type: k };
        }

        // If control made it here, we can't recognize the part of the
        // string in front of us.
        console.error("getNextToken(): Error: Can't recognize gibberish at" +
                      " position " + index + " of \"" + s + "\"");
        return "";
    };

    // Helper function for calculateDamage().  Given an infix stack of
    // tokenInfo objects (like ["2", "+", "5"]), returns an equivalent stack
    // using prefix notation order (like ["+", "2", "5"]).
    //
    // Warning: This function does not handle operator precedence.  If in doubt,
    // use parentheses to group.
    //
    // We could probably handle not only operator precedence, but also
    // function evaluation (!) by using the Shunting-Yard Algorithm.
    let infixToPrefix = function(infixStack) {
        // FOR DEBUGGING
        // let simplifiedInfixStack = [];
        // for (let i = 0; i < infixStack.length; ++i) {
        //     simplifiedInfixStack.push(infixStack[i].token);
        // }
        // console.log("infixToPrefix(): Now dealing with " + simplifiedInfixStack);


        let prefixStack = [];

        // For binary operators, we need to insert the operator into the stack
        // before the two operands that the operator is...well, operating on.
        // That's all well and good if the operands are simple, like "2 + 5".
        // but what do you do about (2 * 6) + 5?  We need insert the + before
        // both the "* 2 6" and the 5 on the stack, so we need to know where
        // the left operand actually _began_.
        let leftOperandIndex = -1;

        for (let i = 0; i < infixStack.length; ++i) {

            let tokenInfo = infixStack[i];
            switch(tokenInfo.type) {
                case "integer":
                case "dice":
                    prefixStack.push(tokenInfo);
                    leftOperandIndex = prefixStack.length - 1;
                    break;
                case "leftParen":
                {
                    // Scan for the first right parenthesis we can see; these
                    // become a miniature stack which we divide and conquer
                    // recursively.
                    let miniInfixStack = [];
                    let unbalancedLeftParentheses = 1;

                    for (let j = i + 1; j < infixStack.length; ++j) {

                        let currentTokenInfo = infixStack[j];
                        switch (currentTokenInfo.type) {
                            case "leftParen":
                                // We're looking for _right_ parens, not left
                                // parens.  I guess we'll deal with you later.
                                unbalancedLeftParentheses += 1;
                                miniInfixStack.push(currentTokenInfo);
                                break;
                            case "rightParen":
                                unbalancedLeftParentheses -= 1;
                                if (unbalancedLeftParentheses === 0) {
                                    // Found our corresponding right paren. Finally!

                                    if (miniInfixStack.length === 0) {
                                        // It's probably harmless to skip this
                                        // check, but in my mind, "2 + ()2" is
                                        // an error, not a synonym for "2 + 2".
                                        console.error("infixToPrefix(): Error:" +
                                                      " Empty parentheses at" +
                                                      " position " + tokenInfo.index);
                                        return [];
                                    }

                                    // Convert the tokens within the parentheses into
                                    // prefix separately using a recursive
                                    // call.
                                    let miniPrefixStack = infixToPrefix(miniInfixStack);

                                    // Push the entire mini prefix stack to the big
                                    // prefix stack.
                                    leftOperandIndex = prefixStack.length;
                                    for (let k = 0; k < miniPrefixStack.length; ++k) {
                                        prefixStack.push(miniPrefixStack[k]);
                                    }

                                    // Move beyond the right parenthesis.
                                    i = j;

                                    // The scanning loop is no longer needed.
                                    j = infixStack.length;
                                } else {
                                    // The right parenthesis wasn't the one we
                                    // were looking for, and it will be dealt
                                    // with recursively.
                                    miniInfixStack.push(currentTokenInfo);
                                }
                                break;
                            default:
                                miniInfixStack.push(currentTokenInfo);
                                break;
                        } // end (switch on the type of token we encountered when scanning)
                    } // end (for each token between the left paren and the end of the stack)

                    // We should have found a right parenthesis by now.
                    if (unbalancedLeftParentheses > 0) {
                        console.error("infixToPrefix(): Error:" +
                                      " no matching right parenthesis" +
                                      " for left parenthesis in" +
                                      " position " + tokenInfo.index);
                        return [];
                    }
                    break;
                } // end (case leftParen)

                case "rightParen":
                    // Left parentheses always look for the corresponding
                    // right parenthesis and deal with all of those tokens at
                    // once.  The _only_ way we could possibly get here is if
                    // we encountered this without first seeing a left
                    // parenthesis.
                    console.error("infixToPrefix(): Error: no matching left" +
                                  " parenthesis for right parenthesis in" +
                                  " position " + tokenInfo.index);
                    return [];

                case "plus":
                case "minus":
                case "times":
                case "divide":
                case "exponent":
                    // Binary operators.
                    if (i === infixStack.length - 1) {

                        // There is no right operand.  The user entered just
                        // "5 +" or something.
                        console.error("infixToPrefix(): Error: binary operator" +
                                      " '" + tokenInfo.token + "' at position " +
                                      tokenInfo.index + " is not followed" +
                                      " by a right operand.");
                        return [];

                    } else if (leftOperandIndex >= 0) {

                        // Insert ourselves before the left operand, and then
                        // pray that the next group of tokens pushed to the
                        // stack evaluate to the right operand!
                        prefixStack.splice(leftOperandIndex, 0, tokenInfo);

                    } else {
                        // There is no left operand yet.  The user entered just
                        // "+ 2" or something.
                        console.error("infixToPrefix(): Error: binary operator" +
                                      " '" + tokenInfo.token + "' is not preceded" +
                                      " by a left operand.");
                        return [];
                    }
                    break;
            } // end (switch on token type)
        } // end (for each token in the infix stack)

        return prefixStack;
    };


    // Takes a stack returned by infixToPrefix() and evaluates it, returning a
    // floating-point numeric value.  As a side effect, the prefixTokenStack
    // will be altered (and ultimately emptied).
    //
    // damageType tells us how to deal with dice rolls.  It can be one of
    // Weapon.useRandomValues (the default), Weapon.useMinimumValues,
    // Weapon.useExpectedValues, or Weapon.useMinimumValues.
    //
    // See Weapon.calculateDamage() for the "damage object" return type.
    let evaluate = function(prefixTokenStack, damageType) {

        let numberStack = [];
        let rollList = [];

        // These are only used for the useMinimumValues/useMaximumValues
        // damageTypes.
        let minStack = [];
        let maxStack = [];

        // FOR DEBUGGING
        // let simplifiedPrefixStack = [];
        // for (let i = 0; i < prefixTokenStack.length; ++i) {
        //     simplifiedPrefixStack.push(prefixTokenStack[i].token);
        // }
        // console.log(simplifiedPrefixStack);

        while (prefixTokenStack.length > 0) {
            let tokenInfo = prefixTokenStack.pop();
            switch (tokenInfo.type) {
                case "integer":
                    numberStack.push(Number(tokenInfo.token));
                    // Ordinary numbers don't have mins or maxes.
                    minStack.push(Number(tokenInfo.token));
                    maxStack.push(Number(tokenInfo.token));
                    break;
                case "dice":
                {
                    let a = tokenInfo.token.split("d");
                    if (a.length !== 2) {
                        console.error("evaluate(): Internal error: Bad dice" +
                                      " token '" + tokenInfo.token +
                                      "' was somehow not rejected prior to evaluation.");
                        return { damage: 0, rolls: [] };
                    }
                    let numberOfDice = Number(a[0]);
                    let facesPerDie = Number(a[1]);
                    let minValue = numberOfDice * 1;
                    let maxValue = numberOfDice * facesPerDie;
                    let result = 0;
                    switch (damageType) {
                        case Weapon.useMinimumValues:
                            // This is just a placeholder on the numberStack.
                            // It will not be used.
                            result = minValue;
                            break;
                        case Weapon.useExpectedValues:
                            // The sum of the numbers between 1 and n is (n *
                            // (n + 1))/2.  The expected value is the average
                            // of that sum, so we divide by n.  Only (n+1)/2
                            // is left.
                            result = (numberOfDice * (facesPerDie + 1)) / 2.0;
                            break;
                        case Weapon.useMaximumValues:
                            // This is just a placeholder on the numberStack.
                            // It will not be used.
                            result = maxValue;
                            break;
                        default:
                            console.warn("evaluate(): Unrecognized damageType" +
                                         " '" + damageType + "'.  Falling" +
                                         " back to Weapon.useRandomValues.");
                            // FALL THROUGH.
                        case Weapon.useRandomValues:
                            // Roll each die individually and add them up.
                            for (let i = 0, min = 1, max = facesPerDie; i < numberOfDice; ++i) {
                                let currentRoll = (Math.floor(Math.random() * (max - min + 1)) + min);

                                // Insert this individual roll at the
                                // beginning of the rolls array.
                                rollList.splice(0, 0, {
                                    die: "1d" + String(facesPerDie),
                                    value: currentRoll
                                });
                                result += currentRoll;
                            }
                            break;
                    }
                    numberStack.push(result);

                    // To calculate the minimum and maximum values of the
                    // expression correctly, we'll need to have both the
                    // minimum and maximum rolls values for the dice at hand.
                    minStack.push(minValue);
                    maxStack.push(maxValue);
                    break;
                }
                case "plus":
                case "minus":
                case "times":
                case "divide":
                case "exponent":
                {
                    if (numberStack.length < 2) {
                        // In case you're wondering how control can make it
                        // here in practice, try Weapon.calculateDamage("5++-8").
                        console.error("evaluate(): Internal error: Can't" +
                                      " evaluate '" + tokenInfo.token +
                                      "' operator due to empty prefix stack.");
                        return { damage: 0, rolls: [] };
                    }
                    let leftOperand = numberStack.pop();
                    let rightOperand = numberStack.pop();

                    // Again, only used for the useMinimumValues and
                    // useMaximumValues damageTypes, but we still need to keep
                    // track of these.
                    let minLeftOperand  = minStack.pop();
                    let minRightOperand = minStack.pop();
                    let maxLeftOperand  = maxStack.pop();
                    let maxRightOperand = maxStack.pop();

                    switch (tokenInfo.token) {
                        case "+":
                            numberStack.push(leftOperand + rightOperand);
                            minStack.push(minLeftOperand + minRightOperand);
                            maxStack.push(maxLeftOperand + maxRightOperand);
                            break;
                        case "-":
                            numberStack.push(leftOperand - rightOperand);
                            minStack.push(minLeftOperand - maxRightOperand);
                            maxStack.push(maxLeftOperand - minRightOperand);
                            break;
                        case "*":
                            numberStack.push(leftOperand * rightOperand);
                            // Take the signs into account.
                            minStack.push(Math.min(minLeftOperand * minRightOperand,
                                                   minLeftOperand * maxRightOperand,
                                                   maxLeftOperand * minRightOperand,
                                                   maxLeftOperand * maxRightOperand));
                            maxStack.push(Math.max(minLeftOperand * minRightOperand,
                                                   minLeftOperand * maxRightOperand,
                                                   maxLeftOperand * minRightOperand,
                                                   maxLeftOperand * maxRightOperand));
                            break;
                        case "/":
                            if (rightOperand === 0 || minRightOperand === 0 || maxRightOperand === 0) {
                                // Warning: Weapon.useMinimumValues and
                                // Weapon.useMaximumValues cannot always catch
                                // cases where a division by 0 is possible.
                                // For instance, "1/(1d6 - 5)" will produce a
                                // valid min and max, even though the
                                // expression is undefined for die=5.
                                console.error("evaluate(): Internal error:" +
                                              " Evaluated an expression with" +
                                              " the potential to divide by 0." +
                                              " The expression is _broken_ and" +
                                              " needs to be fixed.");
                                return { damage: 0, rolls: [] };
                            }
                            numberStack.push(leftOperand / rightOperand);
                            // Take the signs into account.
                            minStack.push(Math.min(minLeftOperand / minRightOperand,
                                                   minLeftOperand / maxRightOperand,
                                                   maxLeftOperand / minRightOperand,
                                                   maxLeftOperand / maxRightOperand));
                            maxStack.push(Math.max(minLeftOperand / minRightOperand,
                                                   minLeftOperand / maxRightOperand,
                                                   maxLeftOperand / minRightOperand,
                                                   maxLeftOperand / maxRightOperand));
                            break;
                        case "^":
                            numberStack.push(Math.pow(leftOperand,
                                                      rightOperand));
                            // Take the signs into account.
                            minStack.push(Math.min(Math.pow(minLeftOperand, minRightOperand),
                                                   Math.pow(minLeftOperand, maxRightOperand),
                                                   Math.pow(maxLeftOperand, minRightOperand),
                                                   Math.pow(maxLeftOperand, maxRightOperand)));
                            maxStack.push(Math.max(Math.pow(minLeftOperand, minRightOperand),
                                                   Math.pow(minLeftOperand, maxRightOperand),
                                                   Math.pow(maxLeftOperand, minRightOperand),
                                                   Math.pow(maxLeftOperand, maxRightOperand)));
                            break;
                        default:
                            console.error("evaluate(): Internal error:" +
                                          " Unsupported binary operator '" +
                                          tokenInfo.token + "'.  You should" +
                                          " never see this message.");
                            return { damage: 0, rolls: [] };
                    }
                    break;
                } // end (case isBinaryOperator)

                default:
                    console.error("evaluate(): Internal error:" +
                                  " Unsupported token type '" +
                                  tokenInfo.token + "'.  You should" +
                                  " never see this message.");
                    return { damage: 0, rolls: [] };

            } // end (switch on the current prefix token)
        } // end (for each token in the prefix stack, evaluated right to left)

        if (numberStack.length === 1) {
            let damageObject = {
                damage: numberStack[0],
                rolls: rollList
            };
            if (damageType === Weapon.useMinimumValues) {
                damageObject.damage = minStack[0];
            } else if (damageType === Weapon.useMaximumValues) {
                damageObject.damage = maxStack[0];
            }
            return damageObject;
        } else {
            console.error("evaluate(): Internal error: There should only be one" +
                          " value on the stack after evaluating the prefix" +
                          " expression, but I'm seeing " + numberStack.length);
            return { damage: 0, rolls: [] };
        }
    };


    // -----------------------------------------------------------------------
    // Public static data.

    // The "List of Weapons" page needs to enumerate through the full list of
    // weapons we have, and that means exposing the dataTable.
    if (!("dataTable" in Weapon)) {
        Weapon.dataTable = dataTable;
    }

    //////////////////////////////////////////////////////////////
    // Constants to pass into calculateDamage() and evaluate(). //
    //////////////////////////////////////////////////////////////

    // Actually roll the dice.  Used for actual gameplay.
    Weapon.useRandomValues   = 0;

    // Use the minimum value of each dice roll (i.e, N for NdM).  Used for
    // displaying damage ranges to the human player.
    Weapon.useMinimumValues  = 1;

    // Use the expected value of each dice roll (e.g., N*(M+1)/2 for NdM.)
    // Used for AI calculations.
    Weapon.useExpectedValues = 2;

    // Use the maximum value of each dice roll (i.e., N*M for NdM).  Used for
    // displaying damage ranges to the human player.
    Weapon.useMaximumValues  = 3;

    // -----------------------------------------------------------------------
    // Public static functions.


    // A helper function for calculateDamage() which splits the given
    // damageString into tokens.  Returns the token array, or an empty array
    // if the damageString was invalid or empty.
    //
    // This would have stayed private, but there are some UI functions in
    // GameController that have use for this.
    if (Weapon.hasOwnProperty("tokenizeDamageString") === false) {
        Weapon.tokenizeDamageString = function(damageString) {
            if (damageString === undefined || damageString.trim().length === 0) {
                return [];
            }

            let tokens = [];
            let index = 0;
            while (index < damageString.length) {
                let tokenInfo = getNextToken(damageString, index);
                if (tokenInfo === "") {
                    // Garbage damage string.
                    return [];
                }

                tokens.push(tokenInfo);

                // Skip this token.
                index = tokenInfo.index + tokenInfo.token.length;
            }

            return tokens;
        };
    }

    // This is a miniature parser for infix expressions of the form
    // "(1D4 + 2*2D6)/5".  We understand parentheses, basic arithmetic, and
    // exponentiation.  We DON'T understand operator precedence; use
    // parentheses judiciously to make up for that.
    //
    // damageType tells us how to deal with dice rolls.  It can be one of
    // Weapon.useRandomValues (the default), Weapon.useMinimumValues,
    // Weapon.useExpectedValues, or Weapon.useMinimumValues.
    //
    // We return a "damage object" consisting of two fields:
    // - damage: The actual damage dealt.  This is usually all you care
    //           about.
    // - rolls: An array of objects each having the following two fields:
    //   * die: A DnD-style dice expression for a single die, like "1d2" (a
    //          coin) or "1d6" (a 6-sided die.)  The first character will
    //          always be "1".
    //   * value: The value that was rolled for this die.
    //
    // When the damageType is Weapon.useExpectedValues, there will be one
    // entry in the "rolls" array for each die in the weapon's damage
    // expression (but keep in mind that a 2d6 will be split into two 1d6
    // rolls).
    //
    // If the dmaageType is not Weapon.useExpectedValues or if the
    // damageString had no die token in the first place, the rolls array
    // will be empty.

    if (Weapon.hasOwnProperty("calculateDamage") === false) {
        Weapon.calculateDamage = function(damageString, damageType) {
            if (damageString === undefined || damageString.trim().length === 0) {
                return { damage: 0, rolls: [] };
            }

            // Convert to prefix notation order and evaluate.
            //
            // Graft on the damageString at the end so that we can use it for
            // displaying formulas on-screen.
            let tokens = Weapon.tokenizeDamageString(damageString);
            let prefixTokens = infixToPrefix(tokens);
            let damageObject = evaluate(prefixTokens, damageType);
            damageObject.damageString = damageString;
            return damageObject;
        };
    }

    // Returns a damage string expression representing the sum of `count'
    // separate invocations of the given damage string.  So, for instance, for
    // a 1d6, this function would return 1d6+ 1d6 + 1d6.  Parentheses are used
    // to group the expressions.
    //
    // We need this because weapons of the same type in an arsenal are always
    // fired together, and the combinedDamageString is the correct expression
    // to evaluate to determine how much damage this deals.
    //
    // For an invalid count or a count less than 2, the original damage string
    // is returned unaltered.

    if (Weapon.hasOwnProperty("getCombinedDamageString") === false) {
        Weapon.getCombinedDamageString = function(damageString, count) {
            let combinedDamageString = damageString;
            if (count > 1) {
                for (let i = 0; i < count - 1; ++i) {
                    combinedDamageString += ") + (";
                    combinedDamageString += damageString;
                }
                combinedDamageString = "(" + combinedDamageString + ")";
            }
            return combinedDamageString;
        };
    }

    // -----------------------------------------------------------------------
    // Public member variables that the caller can manipulate.

    this.shortName    = dataTable[weaponType].shortName;
    this.longName     = dataTable[weaponType].longName;
    this.class        = dataTable[weaponType].class;
    this.damage       = dataTable[weaponType].damage;    // Actually an expression string.
    this.explosion    = dataTable[weaponType].explosion; // Could be undefined.
    this.duration     = dataTable[weaponType].duration;  // Could be undefined.
    this.ammoPerRound = Number(dataTable[weaponType].ammoPerRound);
    this.ammo         = Number(dataTable[weaponType].ammo);

    this.internalName = weaponType; // Just in case we need it again.

    // -----------------------------------------------------------------------
    // Public member functions.

    // Attempts to fire one round of this weapon, then returns the
    // damageObject that round was worth.  We will return a 0 damageObject if
    // we're out of ammo (or if the weapon was harmless to begin with.)
    //
    // Each shot diminishes this.ammo by this.ammoPerRound.  A weapon
    // with 0 ammo per round and >0 ammo has infinite ammunition.
    this.fire = function() {
        if (this.ammo >= this.ammoPerRound) {
            this.ammo -= this.ammoPerRound;
            return Weapon.calculateDamage(this.damage, Weapon.useRandomValues);
        }
        return { damage: 0, rolls: [] };
    };

    return this;
}


(function() {
    new Weapon(); // Ensure that calculateDamage() is available.
}());
