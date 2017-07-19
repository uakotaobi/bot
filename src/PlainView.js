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
// The PlainView is a view that displays the robots in their own floating divs   //
// and looks a lot more like an information panel than a video game.  But it has //
// the advantage of being quicker to code than the 3D terrain thing I was        //
// originally planning.                                                          //
///////////////////////////////////////////////////////////////////////////////////

function PlainView(controller) {
    "use strict";

    // -----------------------------------------------------------------------
    // Static public data (class-level variables.)

    if (!PlainView.hasOwnProperty("spriteTable")) {
        PlainView.spriteTable = {};
    }

    if (!PlainView.hasOwnProperty("dialogIdStack")) {
        PlainView.dialogIdStack = [];
        PlainView.dialogIdCounter = 0;
    }

    const spriteDomIdPrefix = "sprite-";


    // -----------------------------------------------------------------------
    // Private member data (closure-local variables.)


    // When we're positioning the robots, we position them in a virtual grid
    // in order to maximize the area allotted to each bot.  The faction divs
    // are positioned the same way.
    //
    // What should size of these divs be?  Well, that depends on the number of
    // items.  Rather than come up with a formula, I'll just use a data table.
    //
    // The key is the number of items (factions or robots within a single
    // faction.)  The value is an array of two elements: the width in
    // percentage points and the height in percentage points of each
    // individual slot in the area.
    const areaTable = {
        1:  [1.0,    1.0],
        2:  [0.5,    1.0],
        3:  [1/3,    1.0],
        4:  [0.5,    0.5],
        5:  [1/3,    0.5],
        6:  [1/3,    0.5],
        7:  [0.25,   0.5],
        8:  [0.25,   0.5],
        9:  [1/3,    1/3],
        10: [0.25,   1/3],
        11: [0.25,   1/3],
        12: [0.25,   1/3],
        13: [0.25,   0.25],
        14: [0.25,   0.25],
        15: [0.25,   0.25],
        16: [0.20,   0.25],
        17: [0.20,   0.25],
        18: [0.20,   0.25],
        19: [0.20,   0.25],
        20: [0.20,   0.25],
        21: [0.20,   0.20],
        22: [0.20,   0.20],
        23: [0.20,   0.20],
        24: [0.20,   0.20],
        25: [0.20,   0.20]
    };

    // -----------------------------------------------------------------------
    // Private member functions (closure-local functions.)

    // Convert the given string into a CSS identifier which follows the rules
    // of https://www.w3.org/TR/CSS21/syndata.html#value-def-identifier.
    let id = function(s) {
        let safeId = s.replace(/[^a-zA-Z0-9_-]/g, "-");

        // Identifiers aren't allowed to start with digits, so add a prefix
        // just to be safe.
        safeId = "i_" + safeId;
        return safeId;
    };

    // -----------------------------------------------------------------------
    // Public member functions.


    // Adds a Sprite object to the view, placed in front of the given DOM
    // element.
    //
    // A Sprite is essentially an array of animation frames (often just one
    // frame) with a width and a height.  For this PlainView, adding a sprite
    // means allocating a <div/> element in the DOM for it, and possibly
    // registering its update() function for animation callback.
    //
    // Returns the element where the effect is stored.
    this.addSprite = function(sprite, parentElement) {

        // Register the sprite if needed.
        const spriteDomId = spriteDomIdPrefix + sprite.id();

        if (!(id in PlainView.spriteTable)) {

            PlainView.spriteTable[sprite.id()] = sprite;

            let currentFrame = sprite.getCurrentFrame();

            let div = document.createElement("div");
            div.setAttribute("id", spriteDomId);
            div.style.backgroundImage = "url('" + currentFrame.image + "')";
            div.style.backgroundRepeat = "no-repeat";
            div.style.backgroundPosition = -currentFrame.xOffset + "px " + -currentFrame.yOffset + "px";
            div.style.width = sprite.width + "px";
            div.style.height = sprite.height + "px";
            div.style.position = "absolute";
            div.style.left = sprite.x + "px";
            div.style.top = sprite.y + "px";

            parentElement.appendChild(div);

            // If the sprite is animated, it will need to be updated again in
            // the near future.
            if (sprite.framesPerSecond > 0) {
                let update = function(timestampMilliseconds) {
                    let currentFrame = sprite.getCurrentFrame();

                    if (currentFrame !== null) {
                        div.style.backgroundImage = "url('" + currentFrame.image + "')";
                        div.style.backgroundPosition = -currentFrame.xOffset + "px " + -currentFrame.yOffset + "px";

                        // These don't usually change, but just in case
                        // someone does....
                        div.style.left = sprite.x + "px";
                        div.style.top = sprite.y + "px";
                        div.style.zIndex = sprite.layer;
                    }

                    if (!sprite.finished() && currentFrame !== null) {
                        // Schedule the next frame of animation.
                        window.requestAnimationFrame(update);
                    } else {
                        // Animation over.  Destroy ourselves.
                        delete PlainView.spriteTable[sprite.id()];
                        parentElement.removeChild(div);
                    }
                };
                window.requestAnimationFrame(update);
            }
        }
        return document.getElementById(spriteDomId);
    };


    // A helper function that makes it easier to create sprite effects.
    //
    // Returns the sprite we generated.
    this.createEffect = function(parentElement, effectType, x, y, durationMilliseconds, delayMilliseconds) {

        let sprite = SpecialEffectSprite(effectType);
        sprite.x = x;
        sprite.y = y;

        if (durationMilliseconds !== undefined) {
            // Negative durations are not allowed.
            durationMilliseconds = Math.max(0, durationMilliseconds);

            sprite.maxAgeMilliseconds = durationMilliseconds;

            // If the sprite is not a looping animation and the caller gave it
            // a finite duration, accelerate (or decelerate) the animation to
            // catch up to the new duration.  This will prevent it from
            // getting stuck on a frame when it finished prematurely.
            //
            // If the caller did give it a finite duration, then we have no
            // choice but to trust the sprite.framesPerSecond and hope for the
            // best.
            if (sprite.loop === false && durationMilliseconds > 0) {
                sprite.framesPerSecond = sprite.totalFrames() / (durationMilliseconds/1000);
            }
        }

        if (delayMilliseconds === undefined) {
            delayMilliseconds = 0;
        }

        sprite.delayMilliseconds = delayMilliseconds;

        let that = this; // JavaScript loves redefining "this" to the point where I don't trust it in callbacks anymore.
        window.setTimeout(function() {
            that.addSprite(sprite, parentElement);
        }, delayMilliseconds);

        return sprite;
    };


    // Causes the given robot to appear to "blow up".  Its image will
    // disappear and be replaced with various explosion and fire sprites.
    //
    // The explosionType argument can be one of "light", "medium", "heavy", or
    // "assault" -- in other words, one of the known Bot classes.
    //
    // TODO: Nothing's stopping me from also adding various weapon internal
    // names to the switch and just *not* disappearing the robot in those
    // cases.  That gives us per-weapon explosion effects, which could be fun.

    this.explode = function(robot, explosionType, fireDurationMilliseconds, explosionDurationMilliseconds) {

        fireDurationMilliseconds = fireDurationMilliseconds || 60*1000;
        explosionDurationMilliseconds = explosionDurationMilliseconds || 2*1000;

        let robotDiv = document.querySelector("#" + id(robot.id));

        if (robotDiv === null) {
            console.warn("PlainView.explode(): Can't create explosion graphics " +
                         "for " + robot.longName + " " + robot.id + " because" +
                         "no container element for it exists on-screen." +
                         " Perhaps the div was removed?");
            return;
        }

        let imageDiv             = document.querySelector("#" + id(robot.id) + " .main-image");
        let imageDivStyle        = window.getComputedStyle(imageDiv);
        let imageDivWidth        = imageDivStyle.width;
        let imageDivHeight       = imageDivStyle.height;
        imageDivWidth            = Number(imageDivWidth.substr(0, imageDivWidth.length - 2));
        imageDivHeight           = Number(imageDivHeight.substr(0, imageDivHeight.length - 2));
        let robotImage           = document.querySelector("#" + id(robot.id) + " .main-image > img");
        let robotImageStyle      = window.getComputedStyle(robotImage);
        let robotImageWidth      = robotImageStyle.width;
        let robotImageHeight     = robotImageStyle.height;
        let robotImagePaddingTop = robotImageStyle.paddingTop;
        robotImageWidth          = Number(robotImageWidth.substr(0, robotImageWidth.length - 2));
        robotImageHeight         = Number(robotImageHeight.substr(0, robotImageHeight.length - 2));
        robotImagePaddingTop     = Number(robotImagePaddingTop.substr(0, robotImagePaddingTop.length - 2));
        let robotArea            = robotImageWidth * robotImageHeight;
        let robotImageBottomY    = robotImagePaddingTop + robotImageHeight;
        let w                    = 0;
        let h                    = 0;

        switch(explosionType) {
            case "light":
            {
                // A rapid mix of small explosions.
                let explosions = [
                    { type: "e2", w: 128, h: 128 },
                    { type: "e3", w: 128, h: 128 },
                    // { type: "e4", w: 128, h: 128 },
                    { type: "e5", w: 64,  h: 64 }
                ];

                // Start a cluster of f1 fires.  Maybe they'll look coherent together?
                //
                // Update: No. No, they do not.  They look like someone turned
                // up a bunch of pilot lights where the bot was once standing.
                // I still like it, though.
                w = 128;
                h = 256;
                for (let i = 0; i < 6; ++i) {
                    let displacement = {
                        x: random(-Math.min(imageDivWidth/2, 40),
                                   Math.min(imageDivWidth/2, 40)),
                        y: 2 * (i + Math.random())
                    };
                    let f1 = this.createEffect(imageDiv, "f1",
                                               (imageDivWidth/2 - w/2 + displacement.x),
                                               (robotImageBottomY - (h - 30) + displacement.y),
                                               fireDurationMilliseconds,
                                               random(600,1000));
                    f1.framesPerSecond = random(10,25);
                }

                // Lots of small explosions in random places.
                let limit = random(15, 30);
                for (let i = 0; i < limit; ++i) {
                    let index = random(0, explosions.length - 1);
                    let pos = {
                        x: random(0, robotImageWidth),
                        y: random(0, robotImageHeight)
                    };
                    this.createEffect(imageDiv, explosions[index].type,
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - explosions[index].w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - explosions[index].h/2,
                                      explosionDurationMilliseconds,
                                      i * 5);
                }
                window.setTimeout(function() {
                    robotImage.style.opacity = "0.0";
                }, (limit * 5) - 500);

                break;
            }
            case "medium":
            {
                // A couple of random e8s with some small blasts in between.
                // Don't forget the fire.
                let explosions = [
                    { type: "e8", delay: 0, duration: explosionDurationMilliseconds/2, w: 256, h:256 }
                ];

                // Two f2 fire sprites spaced about 30 pixels apart really do
                // look like one continuous flame.  So let's have as many as
                // it takes to cover the div's width.
                w=81; h=123;
                for (let x = imageDivWidth/2 - robotImageWidth/2, effectiveFireWidth = w - 60;
                     x < imageDivWidth/2 + robotImageWidth/2 - w;
                     x += effectiveFireWidth) {
                    let sprite = this.createEffect(imageDiv, "f2",
                                                   x,
                                                   (robotImageBottomY - h + 30 + random(-10, 10)),
                                                   fireDurationMilliseconds + random(100, 500),
                                                   explosionDurationMilliseconds/4);
                    sprite.framesPerSecond += random(-3, 3);
                }

                // It also triggers many smaller e4 blasts.
                let smallExplosionCount = Math.round((robotArea / (128*128)) * 4.4);
                for (let i = 0, delay = 0, delayIncrement = (explosionDurationMilliseconds - explosions[0].duration)/smallExplosionCount;
                     i < smallExplosionCount;
                     ++i, delay += delayIncrement) {

                    let duration = explosionDurationMilliseconds * random(50, 250)/200;
                    explosions.push({
                        type: "e4",
                        delay: delay,
                        duration: duration * i/Math.max(smallExplosionCount, 1),
                        w: 128,
                        h: 128
                    });
                }
                // One last burst.
                explosions.push({ type: "e7", delay: explosionDurationMilliseconds*0.75, duration: explosionDurationMilliseconds*0.9, w: 256, h:256 });

                for (let index = 0; index < explosions.length; ++index) {
                    let pos = {
                        x: random(robotImageWidth * 0, robotImageWidth * 1),
                        y: random(robotImageHeight * 0.25, robotImageHeight * 0.75)
                    };
                    this.createEffect(imageDiv, explosions[index].type,
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - explosions[index].w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - explosions[index].h/2,
                                      explosions[index].duration,
                                      explosions[index].delay);
                }
                window.setTimeout(function() {
                    robotImage.style.opacity = "0";
                }, Math.max(0, explosionDurationMilliseconds - 2000));
                break;
            }
            case "heavy": case "assault":
            {
                // First, start with a cascade of detailed little e1 blasts.
                w = 128;
                h = 128;
                let count1 = Math.round(1.7 * (robotArea / (w * h)));
                for (let i = 0; i < count1; ++i) {
                    let pos = {
                        x: random(robotImageWidth * 0, robotImageWidth * 1),
                        y: random(robotImageHeight * 0, robotImageHeight * 1)
                    };
                    this.createEffect(imageDiv, "e1",
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - h/2,
                                      random(explosionDurationMilliseconds/4, explosionDurationMilliseconds/3),
                                      random(0, explosionDurationMilliseconds / 3));
                }

                // Follow up with a cascade of detailed bigger e7/e8 blasts.
                w = 256;
                h = 256;
                let count2 = Math.round(3.5 * (robotArea / (w * h)));
                for (let i = 0; i < count2; ++i) {
                    let pos = {
                        x: random(robotImageWidth * 0.15, robotImageWidth * 0.85),
                        y: random(robotImageHeight * 0.15, robotImageHeight * 0.85)
                    };
                    this.createEffect(imageDiv, (random(1, 2) === 1 ? "e7" : "e8"),
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - h/2,
                                      random(explosionDurationMilliseconds/3, explosionDurationMilliseconds/2),
                                      random(explosionDurationMilliseconds / 3, 2 * explosionDurationMilliseconds / 3));
                }

                // The robot should have faded away by now.
                window.setTimeout(function() {
                    robotImage.style.opacity = "0";
                }, explosionDurationMilliseconds * 0.5);

                // That's also when the fire starts.
                // F3 fires don't actually take up the full 256 pixels of width.
                w = 256;
                let real_w = 96;
                h = 256;
                let fireCount = 2 + Math.ceil(imageDivWidth / real_w);
                for (let i = 0; i <= fireCount; ++i) {
                    let pos = {
                        x: i * (imageDivWidth - real_w)/fireCount + random(-10, 10),
                        y: random(-10, 10)
                    };
                    let f1 = this.createEffect(imageDiv, "f3",
                                               pos.x - w/2 + real_w/2,
                                               (robotImageBottomY - h) + pos.y,
                                               fireDurationMilliseconds + random(100, 500),
                                               explosionDurationMilliseconds * 0.5);
                    f1.framesPerSecond += 2 * random(-3, 12);
                }

                // Grand finale: a single e9 spark, then a rapid sequence of closely-spaced e6 blasts.
                w = 320;
                h = 320;
                this.createEffect(imageDiv, "e9",
                                  (imageDivWidth/2 - w/2),
                                  (robotImageBottomY - robotImageHeight/2) - h/2,
                                  500,
                                  (2 * explosionDurationMilliseconds / 3) + explosionDurationMilliseconds/2 - 500);
                w = 256;
                h = 256;
                let count3 = random(5, 15);
                for (let i = 0; i < count3; ++i) {
                    let pos = {
                        x: random(robotImageWidth * 0.25, robotImageWidth * 0.75),
                        y: random(robotImageHeight * 0.25, robotImageHeight * 0.75)
                    };
                    this.createEffect(imageDiv, "e6",
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - h/2,
                                      random(500, 4000),
                                      (2 * explosionDurationMilliseconds / 3) + explosionDurationMilliseconds/2 + - 500 + 750);
                }

                // Phew!
                break;
            }
            case "jump":
            {
                // This is not an explosion, _sensu stricto_ (i.e., it does
                // not result in the robot image being hidden at the end of
                // the sequence.)  What it is, though, is a timed animation
                // that affects the robot image itself, causing it to move up
                // and then down again so that it lands by the time
                // explosionDurationMilliseconds is done.
                //
                // fireDurationMilliseconds is used for the duration of the
                // smoke rings left behind.

                let robotImageY = robotImageStyle.top;
                let totalTimeMilliseconds = explosionDurationMilliseconds;
                let startTimeMilliseconds = Date.now();
                robotImageY = Number(robotImageY.substr(0, robotImageY.length - 2));
                const maxHeight = robotImageHeight * 2.5;
                const minY = robotImageY;
                const maxY = robotImageY - maxHeight;

                // Bigger robots take longer to jump.  Medium Bots are
                // considered to be "average" here.
                let smokeRings = 0;
                switch(robot.class) {
                    case "light":
                        smokeRings = random(2, 3);
                        totalTimeMilliseconds *= 0.7;
                        break;
                    case "medium":
                        smokeRings = random(3, 5);
                        break;
                    case "heavy":
                        smokeRings = random(8, 15);
                        totalTimeMilliseconds *= 1.25;
                        break;
                    case "assault":
                        smokeRings = random(13, 20);
                        // A jumping assault mech.  Heaven forfend.
                        totalTimeMilliseconds *= 1.5;
                        break;
                }

                // Let off e10 smoke ring explosions to mimic our "jump
                // thrusters" impacting "the ground".
                for (let w=128, h=128, i=0; i < smokeRings; ++i) {
                    let x = random(imageDivWidth/2 - robotImageWidth/2, imageDivWidth/2 + robotImageWidth/2);
                    let y = random(robotImageBottomY - 10, robotImageBottomY + 10);
                    let duration = random(fireDurationMilliseconds - 500, fireDurationMilliseconds + 500);
                    this.createEffect(imageDiv, "e10",
                                      x - w/2,
                                      y - h/2,
                                      duration,
                                      0);
                }

                let animate = function(timestampMilliseconds) {
                    let currentTimeMilliseconds = Date.now() - startTimeMilliseconds;

                    // Linear interpolation: u = 0 at rest and u = 1 at peak.
                    let u = 0;

                    if (currentTimeMilliseconds > totalTimeMilliseconds) {
                        // Finished.
                        robotImage.style.top = "0";
                    } else {
                        if (currentTimeMilliseconds < totalTimeMilliseconds/2) {
                            // Rising.  u = 0 at ground level (time=0) and 1 at peak (time=half).
                            u = (currentTimeMilliseconds - 0) / (totalTimeMilliseconds/2 - 0);
                        } else {
                            // Falling.  u = 1 at peak (time=half) and 0 at ground level (time=full).
                            u = 1 - (currentTimeMilliseconds - totalTimeMilliseconds/2) / (totalTimeMilliseconds - totalTimeMilliseconds/2);
                        }

                        let y = minY + u * u * u * (maxY - minY);
                        robotImage.style.top = y + "px";
                        window.requestAnimationFrame(animate);
                    }
                };

                // Launch the animation.
                window.requestAnimationFrame(animate);
                break;
            }
            case "blast-lrm":
            case "blast-mrm":
            case "blast-srm":
            case "blast-srm-nomad":
            case "blast-ac-medium":
            case "blast-ac-heavy":
            case "blast-ac-assault":
            {
                // These are not explosions, either, but one-off sprite
                // effects that are used to provide the impression of being
                // hit by a weapon.
                let sequence = [];
                let pos = {
                    x: random(robotImageWidth * 0, robotImageWidth * 1),
                    y: random(robotImageHeight * 0, robotImageHeight * 1)
                };
                switch(explosionType) {
                    case "blast-lrm":
                        explosionDurationMilliseconds += random(1, 500);
                        sequence = [
                            { type: "e2", width: 128, height: 128, duration: 1.0 },
                            { type: "e1", width: 128, height: 128, duration: 0.6, overlap: 1.0 }
                        ];
                        break;
                    case "blast-mrm":
                        sequence = [
                            { type: "e11", width: 100, height: 100, duration: 1.0 },
                        ];
                        break;
                    case "blast-srm":
                        sequence = [
                            { type: "e3", width: 128, height: 128, duration: 0.8 },
                            { type: "e12", width: 100, height: 100, duration: 1.0, overlap: 1.0 }
                        ];
                        break;
                    case "blast-srm-nomad":
                        sequence = [
                            { type: "e3", width: 128, height: 128, duration: 0.8 },
                            { type: "e16", width: 100, height: 100,duration: 0.8, overlap: 0.6 },
                        ];
                        break;
                    case "blast-ac-medium":
                        sequence = [
                            { type: "e16", width: 100, height: 100, duration: 1.0 },
                            { type: "e11", width: 100, height: 100, duration: 0.9, overlap: 0.9  },
                            { type: "e16", width: 100, height: 100, duration: 0.8, overlap: 0.8  },
                        ];
                        break;
                    case "blast-ac-heavy":
                        sequence = [
                            { type: "e8", width: 256, height: 256, duration: 0.8 },
                            // { type: "e16", width: 100, height: 100, duration: 0.9, overlap: 0.9 },
                            // { type: "e12", width: 100, height: 100, duration: 0.9, overlap: 0.9 },
                        ];
                        break;
                    case "blast-ac-assault":
                        sequence = [
                            { type: "e6", width: 256, height: 256, duration: 0.8 },
                            { type: "e6", width: 256, height: 256, duration: 0.9, overlap: 0.9 },
                            { type: "e6", width: 256, height: 256, duration: 0.5, overlap: 0.5 },
                        ];
                        break;
                }
                for (let i = 0, delay = 0; i < sequence.length; ++i) {
                    let durationMilliseconds = explosionDurationMilliseconds * sequence[i].duration;
                    this.createEffect(imageDiv, sequence[i].type,
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - sequence[i].width/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - sequence[i].height/2,
                                      durationMilliseconds,
                                      delay);
                    delay += durationMilliseconds;
                    if (i < sequence.length - 1 && sequence[i + 1].overlap) {
                        delay -= (explosionDurationMilliseconds * sequence[i + 1].overlap);
                    }
                }
                break;
            }
            case "blast-cluster":
            case "blast-machinegun-light":
            case "blast-machinegun-medium":
            {
                let spriteTypes = [];
                let count = 0;
                let durationMilliseconds = 0;
                let delayMilliseconds = 0;
                switch(explosionType) {
                    case "blast-cluster":
                        spriteTypes = ["e12", "e13", "e14"];
                        w = 100;
                        h = 100;
                        count = 14/2;
                        durationMilliseconds = 0.35;
                        // Explosion 0 has a start time of 0.
                        // Explosion 13 has a start time of 0.65 (1.0 - duration).
                        // Delay between start times would be 0.65/count, but duration must be taken into account.
                        delayMilliseconds = (1.0 - durationMilliseconds)/count - durationMilliseconds;
                        break;
                    case "blast-machinegun-light":
                        spriteTypes = ["e5"];
                        w = 64;
                        h = 64;
                        count = 10/2;
                        durationMilliseconds = 0.3;
                        delayMilliseconds = (1.0 - durationMilliseconds)/count - durationMilliseconds;
                        break;
                    case "blast-machinegun-medium":
                        spriteTypes = ["e4"];
                        w = 128;
                        h = 128;
                        count = Math.ceil(10/3);
                        durationMilliseconds = 0.4;
                        delayMilliseconds = (1.0 - durationMilliseconds)/count - durationMilliseconds;
                        break;
                }

                // Convert from percentage to actual units of time.
                delayMilliseconds *= explosionDurationMilliseconds;
                durationMilliseconds *= explosionDurationMilliseconds;

                // A series of short-length, possibly-overlapping explosions.
                for (let i = 0, delay = 0; i < count; ++i) {
                    let pos = {
                        x: random(robotImageWidth * 0,  robotImageWidth),
                        y: random(robotImageHeight * 0, Math.min(robotImageWidth, robotImageHeight))
                    };
                    this.createEffect(imageDiv, spriteTypes[random(0, spriteTypes.length - 1)],
                                      (imageDivWidth/2 - robotImageWidth/2) + pos.x - w/2,
                                      (robotImageBottomY - robotImageHeight) + pos.y - h/2,
                                      durationMilliseconds,
                                      delay);
                    delay += durationMilliseconds;
                    delay += delayMilliseconds;
                    delay += random(-250, 250);
                }
                break;
            }
            // case "assault":
            //     break;
            default:
                w = 320;
                h = 320;
                this.createEffect(imageDiv, "e9",
                                  imageDivWidth/2 - w/2,
                                  robotImageBottomY - h/2,
                                  explosionDurationMilliseconds,
                                  0);
                w=256;
                h=256;
                this.createEffect(imageDiv, "e8",
                                  imageDivWidth/2 - w/2,
                                  robotImageBottomY - h/2,
                                  explosionDurationMilliseconds,
                                  explosionDurationMilliseconds);
                this.createEffect(imageDiv, "e7",
                                  imageDivWidth/2 - w/2,
                                  robotImageBottomY - h/2,
                                  explosionDurationMilliseconds,
                                  explosionDurationMilliseconds*2.5);
                this.createEffect(imageDiv, "e6",
                                  imageDivWidth/2 - w/2,
                                  robotImageBottomY - h/2,
                                  explosionDurationMilliseconds,
                                  explosionDurationMilliseconds*5);
                window.setTimeout(function() {
                    robotImage.style.opacity = "0.1"; // "0";
                }, explosionDurationMilliseconds);

                // Just cause an f1 fire.  Their dimensions are 128x256.
                // w = 128;
                // h = 256;
                // this.createEffect(imageDiv, "f1",
                //                   imageDivWidth/2 - w/2,
                //                   robotImageBottomY - h,
                //                   fireDurationMilliseconds,
                //                   explosionDurationMilliseconds/2);
                break;

        }

    };


    //////////////////////////////////////////////////////////////////////////
    // Keyboard handling code.                                              //
    //////////////////////////////////////////////////////////////////////////


    // Handles all rogue keypresses while the PlainView is active.
    this.keyboardHandler = (function(view) {
        return function(keyboardEvent) {

            // Pressing Escape, Enter, or Space will dismiss any active dialog.
            if (PlainView.dialogIdStack.length > 0) {

                // At least one dialog is active.
                let topmostDialogId = PlainView.dialogIdStack[PlainView.dialogIdStack.length - 1];
                let topmostDialog = document.getElementById(topmostDialogId);

                if (topmostDialog) {

                    let topmostDialogIsClickable = (topmostDialog.onclick !== null);
                    let topmostDialogIsModal = (topmostDialog.querySelector(".overlay").onclick !== null);

                    if (topmostDialogIsClickable || topmostDialogIsModal) {
                        switch (keyboardEvent.key) {
                            case " ":
                            case "Enter":
                            case "Escape":
                                if (topmostDialogIsClickable) {
                                    topmostDialog.click();
                                } else {
                                    topmostDialog.querySelector(".overlay").click();
                                }
                                return;
                        }
                    }

                } else {

                    // How is this possible?
                    console.error("installKeyboardHandler/document.onkeypress():" +
                                  " Internal error: the top ID of the dialogIdStack, \"%s\"," +
                                  " represents a dialog that, for some reason, no" +
                                  " longer exists.", topmostDialogId);
                }
            } // end (if there are active dialogs on the stack)


            //////////////////////////////////////////////////////////////////
            // If control made it here, there was no active dialog to dismiss,
            // or the user pressed something other than ESC, RET, or SPC.
            //
            // The actions that follow only make sense if a human controls the
            // current robot (rather than merely being at the keyboard.)
            //////////////////////////////////////////////////////////////////

            if (!controller.isGameInProgress() ||
                controller.getFactionType(controller.getCurrentRobot().faction) !== "human") {
                return;
            }

            //////////////////////////////////////////////////////////////////
            // This helper function converts a robot to an index in the
            // controller.getGameRobots() array.
            let getRobotIndex = function(robot) {
                if (robot !== null) {
                    let robots = controller.getGameRobots();
                    for (let i = 0; i < robots.length; ++i) {
                        if (robots[i].id === robot.id) {
                            return i;
                        }
                    }
                }
                return -1;
            };

            //////////////////////////////////////////////////////////////////
            // Performs a linear search through the game robots to find
            // the next (or previous) enemy that isn't the current one.
            // Once it's found, we simulate the same sequence of actions
            // that clicking on that robot would simulate (except that we
            // don't display the same dialog.)
            let selectNextEnemy = function(currentRobot, currentEnemyRobotIndex, increment) {

                if (increment === 0) {
                    console.error("PlainView.keyboardHandler/selectNextEnemy():" +
                                  " Internal error: can't obtain next or" +
                                  " previous enemy when the increment is zero.");
                    return;
                }
                let robots = controller.getGameRobots();
                let currentEnemyRobot = robots[currentEnemyRobotIndex];
                let index = currentEnemyRobotIndex;
                while (true) {
                    let robotContainer = document.getElementById(id(robots[index].id));
                    if (robotContainer) {
                        // Uncheck the robot we're moving away from.
                        let robotSelectRadioButton = robotContainer.querySelector(".top-bar input");
                        robotSelectRadioButton.checked = false;
                    }

                    index += increment;
                    if (index < 0) {
                        index += robots.length;
                    } else if (index > robots.length - 1) {
                        index -= robots.length;
                    }

                    if (index === currentEnemyRobotIndex) {
                        // We've wrapped all the way around to the beginning
                        // without seeing a new enemy robot to select, so the
                        // selection remains unchanged.
                        //
                        // That's perfectly normal and common, occurring in
                        // every game where two surviving Bots duke it out --
                        // what's not common is for the currently-selected
                        // robot to already be dead.  In fact, that should not
                        // be possible.
                        if (currentEnemyRobot.hitpoints <= 0) {
                            console.warn("PlainView.keyboardHandler/selectNextEnemy(): " +
                                         "Internal error: The current robot (%s %s) doesn't have any other enemies, and the current enemy robot (%s %s) is dead.  That implies that the game has ended, so how are you reading this?",
                                         currentRobot.longName,
                                         currentRobot.id,
                                         currentEnemyRobot.longName,
                                         currentEnemyRobot.id);
                            return;
                        }

                    } else if (robots[index].faction === currentRobot.faction) {
                        // Skip allies (and ourselves) -- we can't select
                        // them.
                        continue;
                    } else if (robots[index].hitpoints <= 0) {
                        // Skip any dead robots that haven't been removed from the game yet.
                        continue;
                    }

                    // If control made it here, we have found the
                    // next/previous enemy.  Do the same thing that the
                    // user clicking on it would have done.
                    robotContainer = document.getElementById(id(robots[index].id));
                    let robotSelectRadioButton = robotContainer.querySelector(".top-bar input");
                    controller.setCurrentEnemy(robots[index].id);
                    robotSelectRadioButton.checked = true;
                    view.updateRobots();
                    return;

                } // end (while looking for an enemy robot to select)
            };

            //////////////////////////////////////////////////////////////////
            // Selects the next weapon type among the weapons that the
            // given robot has.
            let selectNextWeapon = function(currentRobot, currentWeapon, increment) {

                if (increment === 0) {
                    console.error("PlainView.keyboardHandler/selectNextWeapon():" +
                                  " Internal error: can't obtain next or" +
                                  " previous weapon when the increment is zero.");
                    return;
                }

                // Returns an integer that, when the increment is added to it,
                // will yield the index of the first weapon (index 0.)
                //
                // In either words, returns -1*increment modulo the arsenal length.
                let priorIndex = function() {
                    if (increment > 0) {
                        return currentRobot.arsenal.length - increment;
                    } else {
                        return (-increment) % currentRobot.arsenal.length;
                    }
                };

                let robotContainer = document.getElementById(id(currentRobot.id));
                let arsenal = currentRobot.arsenal;
                let weaponIndex = -1;

                if (currentWeapon === null) {

                    // No weapon was selected yet.  Select the first weapon
                    // (when it's incremented.)
                    weaponIndex = priorIndex();

                } else {
                    // What is the actual index of the weapon that the current
                    // robot has selected?
                    // Well, there's a problem: the GameController doesn't
                    // keep track of that.  It only cares about the current
                    // weapon's _type_.
                    //
                    // Consider a Scarab with two machine guns and a laser (in
                    // that order.)  Arsenal[1], the second machine gun, is
                    // currently selected.  The GameController only knows that
                    // the Scarab has _a_ machine gun selected, so when we try
                    // to do a search to find the machine gun, we'll happily
                    // find it at arsenal[0], not arsenal[1] which the user
                    // actually chose.
                    //
                    // In fact, there is only one way to keep track of this,
                    // and that is by committing the cardinal sin of
                    // inspecting the UI state to see which radio button is
                    // currently checked.

                    let radioButtons = robotContainer.querySelectorAll(String.format(".weapons table tr input"));
                    for (let i = 0; i < radioButtons.length; ++i) {
                        if (radioButtons[i].checked) {
                            // Quick sanity check.
                            if (currentRobot.arsenal[i].internalName !== currentWeapon.internalName) {
                                console.warn("PlainView.keyboardHandler/selectNextWeapon():" +
                                             " Internal error: the current" +
                                             " robot, %s %s, has an actual" +
                                             " current weapon of '%s' (at" +
                                             " index %d), but the caller" +
                                             " said it was '%s'.  Erring on" +
                                             " the side of reality.",
                                             currentRobot.longName,
                                             currentRobot.id,
                                             currentRobot.arsenal[i].internalName,
                                             i,
                                             currentWeapon.internalName);

                            }
                            weaponIndex = i;
                            break;
                        }
                    }

                    if (weaponIndex === -1) {
                        // The robot doesn't have any weapon radio buttons
                        // checked, so it shouldn't have had a currentWeapon
                        // in the first place.
                        console.warn("PlainView.keyboardHandler/selectNextWeapon():" +
                                     " Internal error: the current robot," +
                                     " %s %s, has no selected weapons, yet" +
                                     " the caller claimed the current" +
                                     " weapon was '%s'.  Selecting the" +
                                     " first weapon.",
                                     currentRobot.longName,
                                     currentRobot.id,
                                     currentWeapon.internalName);
                        weaponIndex = priorIndex();
                    }
                }

                // Find the next weapon in the arsenal that still has ammo.
                let index = weaponIndex;
                while (true) {
                    index += increment;
                    if (index < 0) {
                        index += currentRobot.arsenal.length;
                    } else if (index > currentRobot.arsenal.length - 1) {
                        index -= currentRobot.arsenal.length;
                    }

                    if (index === weaponIndex) {
                        // We wrapped all the way around the arsenal without
                        // finding a match.  Looks like the weapon you
                        // currently have is the only one that's not out of
                        // ammo.
                        //
                        // Give up the search and just select that sole
                        // weapon, regardless of its ammo.
                        console.debug("PlainView.keyboardHandler/selectNextWeapon():" +
                                      " %s %s's other weapons are out of" +
                                      " ammo.  Selection unchanged.",
                                      currentRobot.longName,
                                      currentRobot.id);

                    } else if (currentRobot.arsenal[index].ammo < currentRobot.arsenal[index].ammoPerRound) {
                        // We don't want to select weapons that are out of
                        // ammo (unless we have no choice, as in the case
                        // above.)
                        continue;
                    }

                    // If control made it here, we have found the next weapon
                    // to select.
                    let radioButton = robotContainer.querySelector(String.format(".weapons table tr:nth-child({0}) input",
                                                                                 index + 1));
                    controller.setCurrentRobotWeapon(currentRobot.arsenal[index].internalName);
                    radioButton.checked = true;
                    view.updateRobots();
                    return;

                } // end (while looking for the next weapon to select)
            };


            let currentEnemyRobotIndex = Math.max(getRobotIndex(controller.getCurrentRobotEnemy()), 0);
            switch(keyboardEvent.key) {
                case "ArrowLeft":
                    selectNextEnemy(controller.getCurrentRobot(), currentEnemyRobotIndex, -1);
                    break;
                case "ArrowRight":
                    selectNextEnemy(controller.getCurrentRobot(), currentEnemyRobotIndex, 1);
                    break;
                case "ArrowUp":
                    selectNextWeapon(controller.getCurrentRobot(), controller.getCurrentRobotWeapon(), -1);
                    break;
                case "ArrowDown":
                    selectNextWeapon(controller.getCurrentRobot(), controller.getCurrentRobotWeapon(), 1);
                    break;
                case "Escape":
                {
                    let robotsCleanedUp = view.removeDeadRobots(controller.getCurrentRobot().faction);
                    if (robotsCleanedUp == 0) {
                        // I suppose we could use this to pop up a dialog to
                        // end the game.  I don't see why, but we could.
                    }
                    break;
                }
                case " ":
                case "Enter":
                    // Attack if we have the information we need; remind the
                    // user if we don't.
                    view.showNextDialogOrAdvanceTurn();
                    break;
            }
        };
    })(this);

    // As long as the dialog on the top of the stack can be dismissed with a
    // mouse click, it should also be possible to dismiss the dialog with the
    // space bar or enter keys.
    let installKeyboardHandler = function(view) {

        // Someone already seems to have installed us.
        if (PlainView.oldDocumentOnKeyPress) {
            return;
        }

        // Back up the old keyboard handler, if any.
        if (document.onkeypress) {
            PlainView.oldDocumentOnKeyPress = document.onkeypress;
        }

        // The keypress event is not fired for the arrow keys in WebKit
        // browsers.  The keydown event is, though!
        //
        //document.onkeypress = view.keyboardHandler;
        //document.addEventListener("keypress", view.keyboardHandler, false);

        document.onkeydown = view.keyboardHandler;
    };


    // Undoes the effects of installKeyboardHandler().
    let uninstallKeyboardHandler = function() {
        if (!PlainView.oldDocumentOnKeyPress) {
            console.warn("uninstallKeyboardHandler():" +
                         " installKeyboardHandler() has not been" +
                         " invoked recently.");
            return;
        }

        document.onkeypress = PlainView.oldDocumentOnKeyPress;
        delete PlainView.oldDocumentOnKeyPress;
    };


    //////////////////////////////////////////////////////////////////////////
    // Dialog code.                                                         //
    //////////////////////////////////////////////////////////////////////////


    // Creates a new dialog div on the web page and pushes it to the dialog
    // stack.
    //
    // The dialogType can be one of:
    //   - "generic"
    //   - "small"
    //   - "turn"
    // Use "generic" if you want to fill in the rest of the dialog yourself.
    //
    // The cssWidth and cssHeight will be the width and height of the dialog,
    // including CSS units.  As the dialogs are all position:absolute and are
    // direct children of the <body/> tag, I'd recommend using percentages
    // here.
    //
    // Setting cssHeight to an empty string indicates that you want the
    // dialog's height to be adjustable.
    //
    // cssLeft and cssTop control the position of the upper-left corner of the
    // dialog box.  Percentages are a good idea here, too.
    //
    // The timeoutMilliseconds, if supplied and greater than its default of 0,
    // will cause the dialog to automatically fade away after the given number
    // of milliseconds have passed.
    //
    // Finally, the clickToClose argument, if true (which is its default),
    // will cause clicking either on or outside of the dialog to dismiss it.
    // You should set this to false if the user is supposed to interact with
    // UI controls (like form inputs or scrollbars) within the dialog.
    //
    // Returns the DOM object representing the live dialog.  It is important
    // to note that the dialog will still remain invisible until you have set
    // its style.display to "block."  This is done to give you a chance to
    // alter the dialog's contents before making it visible.
    this.addDialog = function(dialogType, cssLeft, cssTop, cssWidth, cssHeight,
                              timeoutMilliseconds, clickToClose) {

        timeoutMilliseconds = timeoutMilliseconds || 0;
        clickToClose = clickToClose || true;
        let dialogDiv = null;

        // Clone the appropriate template.
        switch(dialogType) {
            case "small":
                dialogDiv = document.getElementById("small-dialog-template").cloneNode(true);
                break;
            case "turn":
                dialogDiv = document.getElementById("turn-dialog-template").cloneNode(true);
                break;
            case "endgame":
                dialogDiv = document.getElementById("endgame-dialog-template").cloneNode(true);
                break;
            default:
                console.warn("PlainView.addDialog(): Warning: Unrecognized" +
                             " dialogType \"" + dialogType + "\"; assuming" +
                             " \"generic\".");
                // Fall through.
            case "generic":
                dialogDiv = document.getElementById("dialog-template").cloneNode(true);
                break;
        }

        // Give the dialog a unique ID based on the stack size.
        PlainView.dialogIdCounter += 1;
        let dialogId = "dialog-" + PlainView.dialogIdCounter;
        dialogDiv.setAttribute("id", dialogId);

        let getDialogRemovalFunction = function(view) {
            // The actual onclick function doesn't take a PlainView as an
            // argument and has a different notion of the 'this'
            // variable, so we preserve the view by capturing it in an
            // outer function that generates the onclick function.
            return function() {
                view.removeDialog(dialogId);
            };
        };

        // Did the caller want us to close after a given number of seconds?
        if (timeoutMilliseconds > 0) {
            let view = this;
            window.setTimeout(function() {
                // TODO: Add a CSS animation here on the opacity.

                let dialogOnClick = dialogDiv.onclick;
                let overlayOnClick = dialogDiv.querySelector(".overlay").onclick;

                // Other parts of the program install onclick handlers on the
                // dialog overlays, so we prefer to call those if we can.
                // They'll most certainly kill this dialog as a side effect,
                // which is all we want to do anyway.
                if (dialogOnClick) {
                    dialogOnClick();
                } else if (overlayOnClick) {
                    overlayOnClick();
                } else {
                    // Fallback dialog close routine of last resort.
                    (getDialogRemovalFunction(view))();
                }
            }, timeoutMilliseconds);
        }

        // Did the caller want clicking anywhere outside the div to make us
        // close?  Because if so, we need the built-in invisible full-screen
        // overlay.
        let overlay = dialogDiv.querySelector(".overlay");
        if (clickToClose) {

            dialogDiv.onclick = getDialogRemovalFunction(this);

            // I'm going to interpret having a timeout *and*
            // clickToClose===true as indicating that the dialog is not trying
            // to grab the user's attention.  (If it were, then it would not
            // have a timer on it.)
            //
            // In such cases, we do not need the overlay div, as that would
            // slow the user down by forcing them to click for something which,
            // ultimately, is not that important.
            if (timeoutMilliseconds <= 0) {
                overlay.style.display = "block";
                overlay.onclick = dialogDiv.onclick;
                dialogDiv.onclick = null;
            }
        } else {
            overlay.style.display = "none";
        }

        // Set the position and dimensions.
        dialogDiv.style.left = cssLeft;
        dialogDiv.style.top = cssTop;
        dialogDiv.style.width = cssWidth;
        dialogDiv.style.height = cssHeight;

        // Activate.
        // dialogDiv.style.display = "block";
        let body = document.querySelector("body");
        body.appendChild(dialogDiv);
        PlainView.dialogIdStack.push(dialogId);

        // console.debug(String.format("DialogId {0}: type={1}, timeout={2} ms, click to close={3}",dialogId,dialogType,timeoutMilliseconds,clickToClose));

        return dialogDiv;
    };

    // Removes the dialog with the given ID from the page.  If the ID is not
    // supplied, the dialog on the top of the dialog stack is removed.
    this.removeDialog = function(dialogId) {

        if (!dialogId) {
            if (PlainView.dialogIdStack.length === 0) {
                console.error("PlainView.removeDialog(): There is no " +
                              "topmost dialog to remove.");
            } else {
                dialogId = PlainView.dialogIdStack.pop();
            }
        } else {
            let index = PlainView.dialogIdStack.indexOf(dialogId);

            if (index > -1) {
                PlainView.dialogIdStack.splice(index, 1);
            } else {
                // There are legitimate reasons why the dialogId might no
                // longer be on the stack -- for instance, this function being
                // called from the dialog timeout callback AFTER the user has
                // already clicked to dismiss the dialog.
                //
                // It's not an error.
                return;
            }
        }

        let dialogDiv = document.getElementById(dialogId);
        if (dialogDiv === null) {
            console.error("PlainView.removeDialog(): Internal error: dialogId" +
                          "\"" + dialogId + "\" was on the stack, but there's" +
                          "no div with that ID on the page.");
        } else {
            dialogDiv.remove();
        }
    };


    //////////////////////////////////////////////////////////////////////////
    // Robot-rendering code.                                                //
    //////////////////////////////////////////////////////////////////////////

    // Hides the game view.
    this.hide = function() {
        uninstallKeyboardHandler();
        let contentDiv = document.querySelector("body > .content");

        // It will take us 1 second to fade out.
        contentDiv.style.opacity = "0";
        window.setTimeout(function() {
            contentDiv.style.display = "none";
        }, 1000);
    };


    // Shows the game view.
    this.show = function() {
        installKeyboardHandler(this);
        let contentDiv = document.querySelector("body > .content");
        contentDiv.style.display = "block";

        // No, sorry.  You can't just set the opacity directly and hope the fade happens.
        // There has to be a delay, or no animation for you.
        //
        // At least on Firefox, it doesn't seem to even matter how long the
        // delay *is* -- just that there is one.
        window.setTimeout(function() {
            contentDiv.style.opacity = "1.0";
        }, 1);

        document.querySelector("head title").textContent = "B O T :: Battle Screen";
    };


    // Sets the backdrop for the content div to the given number.  If
    // backdropNumber is not set, a random backdrop is chosen.  This has no
    // influence whatsoever on gameplay.
    this.setBackdrop = function(backdropNumber) {
        const min = 1;
        const max = 2;
        backdropNumber = backdropNumber || Math.floor(Math.random() * (max - min + 1)) + min;

        let backdropClass = "";
        switch(backdropNumber) {
            case 1: backdropClass = "backdrop-1"; break;
            case 2:
            default:
                backdropClass = "backdrop-2";
                break;
        }

        let contentDiv = document.querySelector("body > .content");
        contentDiv.setAttribute("class", "content " + backdropClass);
    };


    // Undoes the effects of PlainView.addRobots() and
    // PlainView.updateFactions() by deleting every faction and robot div.
    // Obviously, this would wreak havoc on a game currently in progress, so
    // we disallow that.
    this.resetGame = function() {
        if (controller.isGameInProgress()) {
            console.warn("PlainView.resetGame(): Cannot reset the view when a game is in progress.  End the current game first.");
            return;
        }

        let allFactionDivs = document.querySelectorAll(".content .faction");
        for (let i = 0; i < allFactionDivs.length; ++i) {
            // Not so fast, /muchacho/.  Don't kill #faction-template -- it
            // contains #robot-template, and we need both of those.
            if (allFactionDivs[i].getAttribute("id") !== "faction-template") {
                allFactionDivs[i].remove();
            }
        }
    };


    // Add a div to the webpage that allows the human player to control a
    // robot on her side (and by "control", I mean to select a weapon that the
    // robot has and then select an enemy to attack.)
    //
    // The divs grow or shrink as needed to ensure that they all fit on the
    // screen.
    //
    // Returns the DOM object we just created (or the existing element if we
    // didn't need to create it.

    this.addRobot = function(robot) {

        if (document.getElementById(id(robot.id)) === null) {

            // We're adding this robot for the first time.

            // Step 1: Allocate the faction divs if we haven't yet.
            this.updateFactions();

            // Step 2: Clone the robot template and make some alterations.
            let robotFactionContainer = document.getElementById(id(robot.faction));
            if (!robotFactionContainer) {
                // Evidently you are trying to add a (dead) robot belonging to
                // a dead faction.
                //
                // Still, since we only call this at the beginning of the
                // game, it shouldn't happen.
                console.warn(String.format("PlainView.addRobot(): Can't add a div for %s %s because it is dead (%d hitpoints) and belongs to a dead faction (%s).  Returning null.",
                                          robot.longName,
                                          robot.id,
                                          robot.hitpoints,
                                          robot.faction));
                return null;
            }

            // We have the container, so now create the robot div itself.
            //
            // It's divided into two sections, "top-bar" and "main-image",
            // with an overlay on the bottom.

            let robotContainer = document.getElementById("robot-template").cloneNode(true);
            robotContainer.setAttribute("id", id(robot.id));
            robotFactionContainer.appendChild(robotContainer);

            // Alter the name, size, and picture.
            let robotNameDiv = document.querySelector("#" + id(robot.id) + " .top-bar .name");
            robotNameDiv.textContent = robot.longName;
            recalculateImageHeight(robot);

            // Step 3: Set the callbacks for this robot's top radio button so
            // that it is playable both as the current robot and as an enemy.
            let robotSelectRadioButton = document.querySelector("#" + id(robot.id) + " .top-bar input");
            let getRobotOnClickHandler = function(view, radioButton) {
                return function() {
                    // Clicking on a dead robot or one of your own robots
                    // should not cause it to be enemy-selected!
                    if (controller.getCurrentRobot() !== null &&
                        robot.faction !== controller.getCurrentRobot().faction &&
                        robot.hitpoints > 0) {

                        robotSelectRadioButton.checked = true;
                        controller.setCurrentEnemy(robot.id);
                        view.updateRobots();
                        view.showNextDialogOrAdvanceTurn();
                    }
                };
            };

            // Clicking on the robot div will enemy-select it, same as clicking on the radio button.
            robotContainer.onclick = getRobotOnClickHandler(this, robotSelectRadioButton);

            // Step 4: Set the callbacks for this robot's 'close button so
            // that the player can remove it from the system (if and only if
            // it's dead.)
            let closeButton = document.querySelector("#" + id(robot.id) + " .top-bar .close");
            let getCloseOnclickHandler = function(view) {
                return function() {
                    view.removeDeadRobot(robot);
                    controller.removeRobot(robot);

                    // Reposition the other robot divs on our side.
                    view.updateRobots();
                };
            };
            closeButton.onclick = getCloseOnclickHandler(this);

            // Step 5: Position the robot correctly.
            this.updateRobots();

            // Step 6: Make it visible.
            robotContainer.style.display = "block";
        }

        return document.getElementById(id(robot.id));
    };


    // Removes a robot's container div from the view if and only if it is dead
    // and allied to the game's current robot.  Returns true if the removal
    // was successful and false otherwise.
    //
    // Note that this function does not update the view afterward--that's your
    // job, caller.
    this.removeDeadRobot = function(robot) {

        let currentRobot = controller.getCurrentRobot();
        if (currentRobot && robot.faction !== currentRobot.faction) {
            console.warn(String.format("PlainView.removeDeadRobot(): Cannot remove the container for robots that are not allied to the current robot's faction ({0}).",
                                       currentRobot.faction));
            return false;
        }

        if (robot.hitpoints > 0) {
            console.warn(String.format("PlainView.removeDeadRobot(): Cannot remove robots that aren't dead.  Your {0} {1} still has {2} hitpoints.",
                                       robot.longName,
                                       robot.id,
                                       robot.hitpoints));
            return false;
        }

        let robotDiv = document.getElementById(id(robot.id));
        if (!robotDiv) {
            // I guess a human closed this div already.
            return false;
        }

        robotDiv.remove();
        return true;
    };


    // Removes the robot divs for all dead robots from a given faction, then
    // removes the robots themselves from the GameController.  Returns the
    // number of robots removed.
    //
    // This function *does* update the view, unlike PlainView.removeDeadRobot().
    this.removeDeadRobots = function(faction) {
        let robots = controller.getGameRobots(faction);
        let deadRobotsRemoved = 0;
        for (let i = 0; i < robots.length; ++i) {
            if (robots[i].hitpoints <= 0 && this.removeDeadRobot(robots[i])) {
                deadRobotsRemoved += 1;
                controller.removeRobot(robots[i]);
            }
        }
        this.updateRobots();
        return deadRobotsRemoved;
    };


    // Helper function for PlainView.addRobot() and PlainView.updateRobots().
    //
    // Calculates the height of the ".robot .image" div that contains the
    // actual picture of the robot, and scales the picture so that 700px
    // images (which represent the tallest robots in this game) take up the
    // full height allotted to them.  Smaller robots are scaled down
    // proportionally.
    //
    // If the adjust argument is missing or set to true, the actual robot
    // image will be adjusted.
    //
    // Regardless of whether adjust was true or not, this function returns an
    // object with three numeric fields:
    //
    // - height:        The height that the robot image should have, in pixels.
    // - paddingTop:    The style.paddingTop that the robot image should have, in pixels.
    // - paddingBottom: The style.paddingBottom that the robot image should have, in pixels.
    let recalculateImageHeight = function(robot, adjust) {

        adjust = adjust || true;
        let result = {
            height: 0,
            paddingTop: 0,
            paddingBottom: 0
        };

        let robotFactionContainer = document.getElementById(id(robot.faction));
        let containerHeight = window.getComputedStyle(robotFactionContainer).height;
        let containerWidth = window.getComputedStyle(robotFactionContainer).width;
        containerHeight = Number(containerHeight.substr(0, containerHeight.length - 2));
        containerWidth = Number(containerWidth.substr(0, containerWidth.length - 2));

        let robotsInFaction = controller.getGameRobots(robot.faction).length;
        let idealRobotWidthPercentage = areaTable[robotsInFaction][0];
        let idealRobotHeightPercentage = areaTable[robotsInFaction][1];

        // The part of the robot div which is not the top bar will be as high
        // as this div, so we need to get it right.
        let robotDiv = document.querySelector("#" + id(robot.id));
        if (!robotDiv) {
            console.warn(String.format("recalculateImageHeight(): Cannot calculate height for {0} {1} because the robot div no longer exists (was it closed?)",
                                       robot.longName,
                                       robot.id));
            return result;
        }
        let mainImageDiv = document.querySelector("#" + id(robot.id) + " .main-image");
        let topBarDiv = document.querySelector("#" + id(robot.id) + " .top-bar");
        let heightOfTopBar = window.getComputedStyle(topBarDiv).height;
        heightOfTopBar = Number(heightOfTopBar.substr(0, heightOfTopBar.length-2));
        heightOfTopBar += 2 * (1 + 3 + 2); // Margins and padding.
        let mainImageDivHeight = Number(idealRobotHeightPercentage * containerHeight - heightOfTopBar);
        mainImageDiv.style.height = mainImageDivHeight + "px";


        // Scale the robot image height down.  700px is the height of the
        // tallest robot images, thus:
        //
        // Main image div height : 700px :: X : Actual robot image height

        let mainImageDivImage = document.querySelector("#" + id(robot.id) + " .main-image img");

        if (adjust) {
            if (mainImageDivImage.naturalHeight === 0) {
                // The robot image isn't loaded yet (perhaps you cleared your
                // cache or are first visiting this page.)  In that case, we'll
                // update the robot _after_ its image is loaded.
                mainImageDivImage.onload = function() {
                    recalculateImageHeight(robot, adjust);
                };
            } else {
                // I think we have better things to do that recalculate the
                // image height over and over!
                mainImageDivImage.onload = null;
            }
        }


        // We want the robot div using our image.  But we're no longer doing
        // it this way:
        //
        //   mainImageDivImage.setAttribute("src", robot.image);
        //
        // The reason being that this leads to a consistent cross-browser
        // problem: the mainImageDivImage.naturalHeight is sometimes able to
        // retain the naturalHeight that is had *before* the src attribute was
        // modified.  And since the src attribute defaults to the 200px-high
        // Munchkin in game.html, this results in Munchkin-sized light,
        // medium, and heavy Bots.
        //
        // Calling recalculateImageHeight() a second time instantly corrects
        // the problem (i.e., the naturalHeight adjusts to a value that
        // matches the new image source), but by then, the damage is done
        // because the game looked silly.
        //
        // I don't know why this happens; I'd expect someImage.naturalHeight to
        // always change in response to a change in someImage.src.  Whatever's
        // causing it, it has something to do with images that are not cached.
        //
        // What follows is a workaround.
        if (mainImageDivImage.getAttribute("src") !== robot.image) {
            mainImageDivImage.remove();
            mainImageDivImage = document.createElement("img");
            mainImageDivImage.setAttribute("src", robot.image);
            mainImageDiv.appendChild(mainImageDivImage);
        }

        let scaledRobotImageHeight = (mainImageDivHeight * mainImageDivImage.naturalHeight) / 700;
        result.height = scaledRobotImageHeight;
        let padding = (mainImageDivHeight - scaledRobotImageHeight) / 2;
        result.paddingTop = padding;
        result.paddingBottom = padding;

        if (adjust) {
            // console.debug("recalculateImageHeight(): Resizing %s %s's image height from %s to %.2f.  Natural height is %.2f px.",
            //               robot.longName,
            //               robot.id,
            //               mainImageDivImage.style.height,
            //               scaledRobotImageHeight,
            //               mainImageDivImage.naturalHeight);

            mainImageDivImage.style.height = result.height + "px";
            mainImageDivImage.style.paddingTop = result.paddingTop + "px";
            mainImageDivImage.style.paddingBottom = result.paddingBottom + "px";

            // One potential problem: scaling to this height might cause us to
            // exceed our maximum allowed width.  It really depends on the robot
            // image we have.
            //
            // Our choices in that case are to change the scaling so we fully fit
            // in our div, or to clip the image.  My preference is the latter (the
            // robot image heights were carefully chosen to provide a sense of
            // scale, and that is compromised if fitting on width shrinks our
            // bot!)
            let idealRobotWidth = idealRobotWidthPercentage * containerWidth;
            let scaledRobotImageWidth = window.getComputedStyle(mainImageDivImage).width;
            scaledRobotImageWidth = Number(scaledRobotImageWidth.substr(0, scaledRobotImageWidth.length - 2));
            let mainImageDivWidth = window.getComputedStyle(mainImageDiv).width;
            mainImageDivWidth = Number(mainImageDivWidth.substr(0, mainImageDivWidth.length - 2));

            if (scaledRobotImageWidth > mainImageDivWidth && scaledRobotImageWidth < idealRobotWidth) {
                // If there is space to expand our main image div to accommodate
                // our current robot image, then do so to whatever extent we can.
                mainImageDiv.style.width = scaledRobotImageWidth + "px";
                mainImageDivImage.style.marginLeft = "0";
            } else if (scaledRobotImageWidth > idealRobotWidth) {
                // The robot image is too wide for the robot div to hold.  Its
                // height is fine; what we need to do is center it.
                mainImageDiv.style.width = idealRobotWidth + "px";
                mainImageDiv.style.overflow = "hidden";
                // Center the robot a little.
                mainImageDivImage.style.marginLeft = (-(scaledRobotImageWidth - idealRobotWidth)/2)+"px";
            } else {
                // Uncenter if we were centered before.
                mainImageDivImage.style.marginLeft = "0";
            }
        }
        return result;
    };


    //////////////////////////////////////////////////////////////////////////
    // Player-neutral UI-refreshing functions.                              //
    //////////////////////////////////////////////////////////////////////////


    // Ensures that the faction divs for all of the active game's factions are
    // created if they do not already exist.  If a faction is dead, their div
    // is resized to nothing, triggering an animation that makes the bot divs
    // in the faction disappear.
    this.updateFactions = function() {

        let content = document.querySelector("body .content");

        const factions = controller.getGameFactions();
        let livingFactionTable = [];
        for (let i = 0; i < factions.length; ++i) {
            let robotsInFaction = controller.getGameRobots(factions[i]);
            let numberOfLivingRobots = 0;
            for (let j = 0; j < robotsInFaction.length; ++j) {
                if (robotsInFaction[j].hitpoints > 0) {
                    numberOfLivingRobots += 1;
                }
            }
            if (numberOfLivingRobots > 0) {
                livingFactionTable.push({
                    originalIndex: i,
                    name: factions[i]
                });
                // Create the faction div if it does not exist.
                if (document.getElementById(id(factions[i])) === null) {
                    let factionDiv = document.createElement("form");
                    factionDiv.setAttribute("id", id(factions[i]));
                    content.appendChild(factionDiv);
                }
            } else {
                // Instead of unceremoniously disappearing the div,
                // we do an animation: set the div's dimensions to 0
                // programmatically, then ensure that the CSS properties for
                // the faction divs have overflow: hidden and a timed CSS
                // transition on the width and height properties.

                let factionDiv = document.getElementById(id(factions[i]));
                if (factionDiv !== null) {
                    factionDiv.style.width = "0";
                    factionDiv.style.height = "0";
                    // factionDiv.style.opacity = "0";
                    // factionDiv.remove();
                }
            }
        }


        let factionWidth = 0.2;
        let factionHeight = 0.2;
        const numberOfFactions = livingFactionTable.length;
        if (numberOfFactions in areaTable) {
            factionWidth  = areaTable[numberOfFactions][0];
            factionHeight = areaTable[numberOfFactions][1];
        }

        // Readjusts the div sizes for factions that are currently on the
        // board ("currently on the board" being defined as id(factionName)
        // existing as an HTML element on the page.)
        //
        // This is called in two contexts: when a faction div is removed due
        // to the faction being eliminated through combat, and when addRobot()
        // is adding faction divs to place its robots in.


        for (let factionIndex = 0, rowPercentage = 0; rowPercentage < 1; rowPercentage += factionHeight) {
            for (let columnPercentage = 0; columnPercentage < 1; columnPercentage += factionWidth, factionIndex++) {

                let factionName = livingFactionTable[factionIndex].name;
                let originalIndex = livingFactionTable[factionIndex].originalIndex;

                let existingContainer = document.getElementById(id(factionName));

                existingContainer.setAttribute("class", "faction faction-" + originalIndex);
                existingContainer.style.width = (100 * factionWidth) + "%";
                existingContainer.style.height = (100 * factionHeight) + "vh"; // View Height.  This is vital; height% doesn't work at all.
                existingContainer.style.left = (100 * columnPercentage) + "%";
                existingContainer.style.top = (100 * rowPercentage) + "%";

                // console.debug("Set #%s's height to (100 * %s)vh (%s) = %s.",
                //              id(factionName),
                //              factionHeight.toFixed(2),
                //              existingContainer.style.height,
                //              window.getComputedStyle(existingContainer).height);
            }
        }

        // let foo = [];
        // function getLivingRobots(factionName) {
        //     let robots = controller.getGameRobots(factionName);
        //     return robots.filter(function(robot) {
        //         return (robot.hitpoints > 0);
        //     });
        // }
        // for (let i = 0; i < factions.length; ++i) {
        //     foo.push({
        //         name: factions[i],
        //         robots: getLivingRobots(factions[i]).length,
        //         height: window.getComputedStyle(document.getElementById(id(factions[i]))).height,
        //         toString: function() {
        //             return String.format("[{0}({1}): {2}/{3}]", this.name, i, this.robots, this.height);
        //         }
        //     });
        // }
        //
        // console.debug("PlainView.updateFactions(): There are %d living factions (%s%%x%s%%).  Faction robot counts and container heights: %s",
        //               numberOfFactions,
        //               (factionWidth*100).toFixed(2),
        //               (factionHeight*100).toFixed(2),
        //               foo);
    };


    // Make corrections to the visual appearance of all robot divs so that
    // they looks right from the perspective of the game's currently active
    // robot.
    this.updateRobots = function() {
        this.updateFactions();

        let activeRobot = controller.getCurrentRobot();
        let robots = controller.getGameRobots();
        let factionNames = controller.getGameFactions();

        let factionIndex = { };
        for (let i = 0; i < factionNames.length; ++i) {

            let factionName = factionNames[i];
            factionIndex[factionName] = -1;
            let factionDiv = document.getElementById(id(factionName));

            if (factionDiv !== null) {
                // Robot images always point to the left.  But if the robot is on
                // the left side of the board, it needs to point right.  CSS3
                // transforms can do this for us, but we need to be able to find
                // such robots.
                let flipped = "";
                let factionLeftPercentage = factionDiv.style.left;
                factionLeftPercentage = factionLeftPercentage.substr(0, factionLeftPercentage.length - 1);
                if (factionLeftPercentage < 50) {
                    flipped = " flipped";
                }

                // Set the active robot's faction to active (in a CSS sense.)
                if (activeRobot && factionName === activeRobot.faction) {
                    factionDiv.setAttribute("class", "faction faction-" + i + flipped + " active");
                } else {
                    factionDiv.setAttribute("class", "faction faction-" + i + flipped + " inactive");
                }
            } else {
                // Something removed the faction div from the UI, probably
                // because the faction was defeated.  This is not an error
                // condition.
            }
        }


        // Whenever the user clicks on a weapon's radio button, that should
        // also set the current weapon for the next attack.
        //
        // This function is a 2-ary function that generates a nullary
        // function which is the actual event handler.  That way, we can
        // capture the view and weapon arsenal index when assigning the
        // handler down below.
        let getWeaponOnClickHandler = function(view, robotId, index) {
            return function() {
                let currentRobot = controller.getCurrentRobot();
                if (currentRobot !== null && currentRobot.id === robotId) {
                    if (index >= currentRobot.arsenal.length) {
                        console.error("PlainView.updateRobots()/getWeaponOnClickHandler(): " +
                                      " Internal error: the index passed into" +
                                      " the generator function was invalid (it" +
                                      " was %d, but we only have %d entries.)" +
                                      " That leaves us unable to select this" +
                                      " weapon, which should not happen.",
                                      index, currentRobot.arsenal.length);
                    } else {
                        controller.setCurrentRobotWeapon(currentRobot.arsenal[index].internalName);
                    }

                    let radioButton = document.querySelector(String.format("#{0} .weapons table tr:nth-child({1}) input",
                                                                          id(currentRobot.id),
                                                                          index + 1));
                    radioButton.checked = "checked";
                    view.updateRobots();
                    view.showNextDialogOrAdvanceTurn();
                }
            };
        };


        for (let i = 0; i < robots.length; ++i) {

            let robot = robots[i];
            let numberOfRobotsInFaction = controller.getGameRobots(robot.faction).length;
            factionIndex[robot.faction]++;

            let robotDiv = document.getElementById(id(robot.id));
            if (robotDiv === null) {
                // Clearly, no one has called PlainView.addRobot() on this
                // robot yet.  It happens.  Ignore it.
                continue;
            }

            // Position this robot relative to its allies.
            //
            // The coordinate system for positioning does not care whether a
            // robot is dead -- at least for now.  Remember that we still want
            // to display dead robots (if for now other reason than to show
            // the towering column of flame that represents its dead remains.)
            //
            // We're going to start having problems after the 25th robot in a
            // faction.
            let robotWidthPercentage = 0.2;
            let robotHeightPercentage = 0.2;
            if (numberOfRobotsInFaction in areaTable) {
                robotWidthPercentage = areaTable[numberOfRobotsInFaction][0];
                robotHeightPercentage = areaTable[numberOfRobotsInFaction][1];
            }
            let rows            = Math.round(1 / robotHeightPercentage);
            let columns         = Math.round(1 / robotWidthPercentage);
            let offset          = factionIndex[robot.faction];
            let row             = Math.floor(offset / columns);
            let column          = offset % columns;
            robotDiv.style.left = Math.floor((column / columns) * 100) + "%";
            robotDiv.style.top  = Math.floor((row / rows) * 100) + "%";
            recalculateImageHeight(robot);

            let deadClass = "";
            if (robot.hitpoints <= 0) {

                /////////////////////////
                // This robot is dead. //
                /////////////////////////
                deadClass = " dead";
            }

            if (activeRobot && robot.id === activeRobot.id) {

                ////////////////////////////////////////////////////////////////////////
                // This robot is the active robot (the last one the user clicked on.) //
                ////////////////////////////////////////////////////////////////////////

                robotDiv.setAttribute("class", "robot active");

            } else if (activeRobot && robot.faction === activeRobot.faction) {

                /////////////////////////////////////////////////////////////
                // This robot is on the user's side (but it's not active.) //
                /////////////////////////////////////////////////////////////


                robotDiv.setAttribute("class", "robot inactive" + deadClass);

            } else {

                /////////////////////////////////////////////////
                // This robot is an enemy of the active robot. //
                /////////////////////////////////////////////////

                if (controller.getCurrentRobotEnemy() !== null &&
                    robot.id === controller.getCurrentRobotEnemy().id) {

                    robotDiv.setAttribute("class", "robot targeted" + deadClass);
                } else {
                    robotDiv.setAttribute("class", "robot" + deadClass);
                }
            }

            // Now that the correct divs are showing, update the hitpoints and
            // weapons.

            let hitpointsDiv = document.querySelector("#" + id(robot.id) + " .top-bar .hp .number");
            hitpointsDiv.textContent = robot.hitpoints;
            // Our team's hitpoints change color to let us know at a glance
            // how badly we're doing.
            if (activeRobot && robot.faction === activeRobot.faction) {
                if (robot.hitpoints/robot.originalHitpoints < 0.333) {
                    hitpointsDiv.setAttribute("class", "number low");
                } else if (robot.hitpoints/robot.originalHitpoints < 0.666) {
                    hitpointsDiv.setAttribute("class", "number medium");
                } else {
                    hitpointsDiv.setAttribute("class", "number high");
                }
            } else {
                hitpointsDiv.setAttribute("class", "number");
            }

            let tbody = document.querySelector("#" + id(robot.id) + " .weapons table tbody");
            while (tbody.children.length < robot.arsenal.length) {
                // If our weapon table doesn't have enough rows, clone the
                // rows until we have enough.
                let newRow = tbody.firstChild.cloneNode(true);
                newRow.removeAttribute("class");
                tbody.appendChild(newRow);
            }
            while (tbody.children.length > robot.arsenal.length) {
                // If our table has too many rows, delete the rows until we
                // have the right number.
                tbody.removeChild(tbody.lastChild);
            }

            // Alter the rows to match the robot's current weapons and ammo.
            for (let i = 0; i < tbody.children.length; ++i) {
                let currentRow = tbody.children[i];

                let inputRadioButton = currentRow.querySelector("input");
                if (inputRadioButton !== null) {
                    // The radio button will disappear once you run out of
                    // ammo.
                    let ammoClass = "";
                    if (robot.arsenal[i].ammo < robot.arsenal[i].ammoPerRound) {
                        ammoClass = " empty";
                    }

                    if (!activeRobot || robot.id !== activeRobot.id || inputRadioButton.checked === false) {
                        inputRadioButton.checked = false;
                        currentRow.setAttribute("class", ammoClass);
                    } else {
                        inputRadioButton.checked = true;
                        currentRow.setAttribute("class", "active" + ammoClass);
                    }

                    // Clicking on a weapon's radio button should make that
                    // the currently-selected weapon for the purposes of the
                    // next attack.
                    if (!inputRadioButton.onlick) {
                        inputRadioButton.onclick = getWeaponOnClickHandler(this, robot.id, i);
                    }
                    if (!currentRow.onclick) {
                        currentRow.onclick =  getWeaponOnClickHandler(this, robot.id, i);
                    }
                }

                // Set the weapon name.
                let nameCell = currentRow.querySelector(".name");
                if (nameCell !== null) {
                    nameCell.textContent = robot.arsenal[i].shortName;

                    // Calculate the damage range in order to create a helpful
                    // tooltip.
                    let minDamage = Weapon.calculateDamage(robot.arsenal[i].damage, Weapon.useMinimumValues).damage;
                    let maxDamage = Weapon.calculateDamage(robot.arsenal[i].damage, Weapon.useMaximumValues).damage;

                    // Disallow negative damages.
                    minDamage = Math.max(0, minDamage);
                    maxDamage = Math.max(0, maxDamage);

                    let damageRangeString = " (" + minDamage + "-" + maxDamage + " damage)";
                    if (minDamage === maxDamage) {
                        damageRangeString = " (" + minDamage + " damage)";
                    }
                    nameCell.setAttribute("title", robot.arsenal[i].longName + damageRangeString);
                }

                // Update the weapon ammunition.
                let ammoCell = currentRow.querySelector(".ammo");
                if (ammoCell !== null) {

                    if (robot.arsenal[i].ammoPerRound <= 0) {
                        ammoCell.textContent = "∞";
                        ammoCell.setAttribute("title", "Unlimited ammunition");
                    } else {
                        ammoCell.textContent = robot.arsenal[i].ammo;
                        ammoCell.setAttribute("title", Math.floor(robot.arsenal[i].ammo/robot.arsenal[i].ammoPerRound) + " rounds(s) remaining");
                    }

                    // Not enough ammo?
                    if (robot.arsenal[i].ammo < robot.arsenal[i].ammoPerRound) {
                        ammoCell.class = "ammo insufficient";
                    } else {
                        ammoCell.class = "ammo";
                    }
                }
            } // end (for each row in the arsenal table)
        } // end (for each robot in the game)
    };


    // A helper function for AiPlayers (humans already know how to click on
    // checkboxes.)
    //
    // Ensures that the given robot's upper-left corner radio button is
    // selected (or deselected if checked === false).  This function fails if
    // given a robot that is part of the same faction as
    // controller.getCurrentRobot() (you can't select those.)
    //
    // Returns true if the selection succeeded and false otherwise.
    this.selectEnemyRobot = function(enemyRobot, checked) {

        if (checked === undefined) {
            checked = true;
        }

        if (!enemyRobot) {
            console.warn("PlainView.selectEnemyRobot(): enemyRobot is null.  There's nothing to select.");
            return false;
        }

        let robotDiv = document.getElementById(id(enemyRobot.id));

        if (!robotDiv) {
            console.warn("PlainView.selectEnemyRobot(): Can't select %s with " +
                         "ID %s because its div is missing.  (The robot is " +
                         "probably dead and owned by a human player who " +
                         "subsequently closed it.)",
                         enemyRobot.longName,
                         enemyRobot.id);
            return false;
        }

        let currentRobot = controller.getCurrentRobot();
        if (currentRobot === null) {
            console.warn("PlainView.selectEnemyRobot(): Can't select %s with " +
                         "ID %s because there is no current robot.  (The game is " +
                         "either finished or it has not started yet.)",
                         enemyRobot.longName,
                         enemyRobot.id);
            return false;
        }

        if (enemyRobot.faction === currentRobot.faction) {
            console.warn("PlainView.selectEnemyRobot(): Can't select %s with " +
                         "ID %s because it is part of the current robot's " +
                         "team (%s %s -- %s).  Only enemy robots can be selected.",
                         enemyRobot.longName,
                         enemyRobot.id,
                         currentRobot.longName,
                         currentRobot.id,
                         currentRobot.faction);
            return false;
        }

        robotDiv.querySelector(".top-bar input").checked = (checked === true ? "checked" : "");
        return true;
    };


    // A helper function for AiPlayers (humans already know how to click on
    // checkboxes.)
    //
    // Ensures that the radio button for the given robot's given weapon is
    // selected (or deselected if checked === false).  This function fails
    // if the given robot is not the current robot or if the current robot
    // doers not own the given weapon.
    //
    // Returns true if the selection succeeded and false otherwise.
    this.selectCurrentRobotWeapon = function(robot, weaponName, checked) {

        if (checked === undefined) {
            checked = true;
        }
        let robotDiv = document.getElementById(id(robot.id));

        if (!robotDiv) {
            console.warn("PlainView.selectCurrentRobotWeapon(): Can't select a weapon for %s with " +
                         "ID %s because its div is missing.  (The robot is " +
                         "probably dead and owned by a human player who " +
                         "subsequently closed it.)",
                         robot.longName,
                         robot.id);
            return false;
        }

        let weapons = robot.findWeapons(weaponName);
        if (weapons.length === 0) {
            console.warn("PlainView.selectCurrentRobotWeapon(): Can't select '%s' weapon for %s with " +
                         "ID %s because the %s does not have that weapon or is out of ammunition for it.",
                         weaponName,
                         robot.longName,
                         robot.id,
                         robot.longName);
            return false;
        }

        let index = -1;
        for (let i = 0; i < robot.arsenal.length; ++i) {
            if (robot.arsenal[i].internalName === weapons[0].internalName) {
                index = i;
                break;
            }
        }

        robotDiv.querySelector(String.format(".weapons tr:nth-child({0}) input", index + 1)).checked = (checked === true ? "checked" : "");
        return true;
    };


    // Takes the given damage report object and constructs an English sentence
    // describing it in glowing terms, including HTML markup that will be
    // highlighted if your parent CSS class is "narrative".
    //
    // We need a reference to the actual defending robot here because the game
    // may well be over by the time we weave our narrative (in which case,
    // controller.getCurrentRobot() and controller.getCurrentRobotEnemy()
    // won't work.)
    //
    // Returns the sentence string.
    this.weaveNarrative = function(damageReport, attackingRobot, attackingRobotWeapon, defendingRobot) {
        let enemyName = String.format("the <strong class='enemy name'>{0}</strong>", defendingRobot.longName);
        if (defendingRobot.longName === attackingRobot.longName) {
            enemyName = "<strong class='enemy name'>its counterpart</strong>";
        }

        let armorAdjective = "";
        let averageArmorDamagePrevented =
                Weapon.calculateDamage(defendingRobot.armor,
                                       Weapon.useExpectedValues).damage;
        if (averageArmorDamagePrevented >= 5) {
            armorAdjective = "massive ";
        } else if (averageArmorDamagePrevented >= 3.5) {
            armorAdjective = "thick ";
        } else if (averageArmorDamagePrevented > 0) {
            // armorAdjective = "modest ";
            // armorAdjective = "thin ";
        }

        let damageAdjective = "";
        if (damageReport.originalDamage.damage > 30) { // EMF damage levels and above
            let n = Math.random();
            if (n > 0.75) {
                // damageAdjective = "a <strong>resounding</strong> ";
                damageAdjective = "an <strong>overwhelming</strong> ";
            } else if (n > 0.5) {
                // damageAdjective = "an <strong>unbelievable</strong> ";
                damageAdjective = "a <strong>jaw-dropping</strong> ";
            } else if (n > 0.25) {
                damageAdjective = "an <strong>incredible</strong> ";
            }
        } else if (damageReport.originalDamage.damage > 23) { // max(4d6) or greater
            let n = Math.random();
            if (n > 0.5) {
                // damageAdjective = "a massive ";
                damageAdjective = "a staggering ";
            }
        } else if (damageReport.originalDamage.damage < 3) { // Less than a light laser
            let n = Math.random();
            if (n > 0.75) {
                damageAdjective = "just ";
            } else if (n > 0.5) {
                // damageAdjective = "a paltry ";
                damageAdjective = "a measly ";
            } else if (n > 0.25) {
                // damageAdjective = "a quite pathetic ";
                // damageAdjective = "a mere ";
                // damageAdjective = "a meager ";
                // damageAdjective = "an underwhelming ";
                damageAdjective = "only ";
            }
        }

        if (damageAdjective === "" && Math.random() > 0.25) {
            // These are some fallback adjectives we use in certain scenarios.

            let maxPossibleDamage = Weapon.calculateDamage(damageReport.originalDamage.damageString,
                                                           Weapon.useMaximumValues).damage;
            let expectedDamage = Weapon.calculateDamage(damageReport.originalDamage.damageString,
                                                        Weapon.useExpectedValues).damage;

            // Dealing the 75th percentile of damage for your damage curve
            // (rounded up, of course) is worthy of at least minor praise.
            let upperThreshold = Math.ceil((expectedDamage + maxPossibleDamage)/2);
            if (damageReport.originalDamage.damage >= upperThreshold) {
                // Okay, let's talk numbers:
                //
                // - The Cluster Bomb 4x is really an 8d2, and so has an expected
                //   damage of 12 and a max damage of 16.  You're only
                //   "impressive" at 14 or more, meaning you only get to miss two
                //   coin flips out of 8 (a 13% chance of happening.)
                //
                // - A theoretical 1d6 + ((1d2 * 1d2) * (1d2 * 1d2)) has a max of
                //   22, an expected damage of 3.5 + (1.5)^4 = 8.5625 (fairly
                //   low--coins do that a lot), and would only be "impressive"
                //   under this new heuristic if it dealt greater than
                //   ceil(15.28125) damage, which it has a ~6% chance to do.
                //
                // - For a mundane amount of damage like the well-studied 3d6,
                //   "impressive" is ceil(14.25) damage or more (about a 9% chance
                //   of happening.)
                damageAdjective = "a respectable ";
                if (damageReport.originalDamage.damage > upperThreshold) {
                    damageAdjective = "an impressive ";
                }
            }

            let minPossibleDamage = Weapon.calculateDamage(damageReport.originalDamage.damageString,
                                                           Weapon.useMinimumValues).damage;

            // Similarly, dealing less than the 25th percentile of damage
            // qualifies you for modest admonishment.
            let lowerThreshold = Math.floor((minPossibleDamage + expectedDamage)/2);
            if (damageReport.originalDamage.damage < lowerThreshold) {
                let n = Math.random();
                if (n > 0.6) {
                    damageAdjective = "a rather disappointing ";
                } else if (n > 0.3) {
                    // damageAdjective = "a depressingly low ";
                    // damageAdjective = "a surprisingly low ";
                    // damageAdjective = "an unusually low ";
                    damageAdjective = "an unexpectedly low ";
                } else {
                    // damageAdjective = "a less-than-impressive ";
                    // damageAdjective = "an admittedly bad ";
                    damageAdjective = "an unimpressive ";
                }
            }
        } // end (if we don't have a damage adjective yet and the system feels like adding one)


        // It's like Mad Libs with robots.
        let narrative = "";

        if (damageReport.originalDamage.damage <= 0) {

            // Your weapon's intrinsic damage was non-positive?  Its
            // damageString must be terrible!
            narrative +=
                String.format("The <span class='name'>{0}'s</span> " +
                              "{1} <strong class='enemy'>jams</strong>, " +
                              "dealing no damage this round.",
                              attackingRobot.longName,
                              attackingRobotWeapon.longName);

        } else if (damageReport.finalDamage === 0) {

            // Something prevented you from dealing your damage.  But
            // what?
            if (damageReport.jumped) {

                if (damageReport.jumpDamage.damage >= damageReport.originalDamage.damage) {

                    let attackerName = String.format("the <strong class='name'>{0}</strong>", attackingRobot.longName);
                    if (attackingRobot.longName === defendingRobot.longName) {
                        attackerName = "<strong class='name'>its counterpart</strong>";
                    }

                    // The jump prevented all the damage on its own.
                    narrative +=
                        String.format("The <span class='enemy name'>{0}</span> " +
                                      "<strong class='enemy'>jumps</strong>, " +
                                      "avoiding {1} point{2} of damage from {3}.",
                                      defendingRobot.longName,
                                      damageReport.originalDamage.damage,
                                      (damageReport.originalDamage.damage > 1 ? "s" : ""),
                                      attackerName);
                } else {
                    // The jump partially worked.  since we still took no
                    // damage, armor must account for the rest.  Bots that
                    // can jump and have armor are rare (just the Kappa at
                    // the moment.)

                    narrative +=
                        String.format("The <span class='name'>{0}</span> " +
                                      "attacks {1} for {2}{3} damage",
                                      attackingRobot.longName,
                                      enemyName,
                                      damageAdjective,
                                      damageReport.originalDamage.damage);

                    narrative +=
                        String.format(". The <span class='enemy" +
                                      "name'>{0}</span> " +
                                      "<strong>partially</strong> dodges " +
                                      "the attack by jumping, but the " +
                                      "remaining {1} damage is <strong " +
                                      "class='enemy'>deflected</strong> by " +
                                      "its armor plating.  It takes no " +
                                      "damage this round.",
                                      defendingRobot.longName,
                                      damageReport.originalDamage.damage - Math.floor(damageReport.jumpDamage.damage));

                }
            } else {

                // The enemy's armor alone was responsible.
                narrative +=
                    String.format("The <span class='name'>{0}</span> deals " +
                                  "{1} damage, but it is <strong " +
                                  "class='enemy'>completely " +
                                  "deflected</strong> by the <span " +
                                  "class='enemy name'>{2}'s</span> " +
                                  "{3}armor plating.",
                                  attackingRobot.longName,
                                  damageReport.originalDamage.damage,
                                  defendingRobot.longName,
                                  armorAdjective);
            }
        } else {

            // You dealt at least some damage.  We need a full report.

            narrative +=
                String.format("The <span class='name'>{0}</span> " +
                              "attacks {1} for {2}{3} damage",
                              attackingRobot.longName,
                              enemyName,
                              damageAdjective,
                              damageReport.originalDamage.damage);


            // Can the enemy jump?  (Regardless of whether they have armor.)
            if (defendingRobot.jump) {
                // Okay, *did* they?
                if (damageReport.jumped) {
                    // The jump was clearly only partially successful.
                    narrative +=
                        String.format(". The <span class='enemy name'>{0}</span> attempts to jump but still takes {1} damage",
                                      defendingRobot.longName,
                                      damageReport.originalDamage.damage - Math.floor(damageReport.jumpDamage.damage));

                    // Bots that can jump and have armor are rare, but
                    // they do exist.
                    if (defendingRobot.armor !== "") {

                        if (damageReport.armorDamage.damage > 0) {
                            narrative += String.format(", {0} of which {1} <strong class='enemy'>deflected</strong> by its {2}armor plating.",
                                                       damageReport.armorDamage.damage,
                                                       (damageReport.armorDamage.damage > 1 ? "are" : "is"),
                                                       armorAdjective);
                        } else {
                            // The jump did the trick, but the armor failed to play its part.
                            narrative += String.format(". Curiously, its armor plating affords it <strong>no protection</strong>.");
                        }

                    } else {
                        narrative += ".";
                    }
                } else {
                    // Jump failed.
                    narrative +=
                        String.format(". The <span class='enemy name'>{0}</span> attempts to avoid this by jumping but <strong>fails</strong>",
                                      defendingRobot.longName);

                    // Bots that can jump and have armor are rare, but
                    // they do exist.
                    if (defendingRobot.armor !== "") {
                        if (damageReport.armorDamage.damage > 0) {
                            narrative += String.format("; its {0}armor still prevents {1} point{2} of damage.",
                                                       armorAdjective,
                                                       damageReport.armorDamage.damage,
                                                       (damageReport.armorDamage.damage > 1 ? "s" : ""));
                        } else {
                            // The jump misfired *and* the armor misfired.
                            // Whatever you paid for this Bot, you should ask
                            // for your money back.
                            narrative += String.format(" and takes <strong>full damage</strong>, thanks in no small part to its laughable excuse for armor.");
                        }
                    } else {
                        narrative += ".";
                    }
                }

            } else if (defendingRobot.armor !== "") {
                // Okay, so the enemy can't jump.  But if they have armor that
                // worked, we should show that.

                if (damageReport.armorDamage.damage > 0) {

                    let addendum = ".";
                    if (defendingRobot.hitpoints <= 0) {
                        addendum = ", but this is not enough.";
                    }

                    narrative += String.format(".  The <span class='enemy name'>{0}'s</span> {1}armor plating <strong class='enemy'>prevents</strong> {2} damage{3}",
                                               defendingRobot.longName,
                                               armorAdjective,
                                               damageReport.armorDamage.damage,
                                               addendum);
                } else {
                    // The armor didn't work.  The whole point of armor is to
                    // *protect* you!
                    narrative += String.format(", <strong>not hampered in the slightest</strong> by the <span class='enemy name'>{0}'s</span> so-called armor.",
                                               defendingRobot.longName);
                }

            } else {
                // No jump, no armor.  That's actually pretty rare
                // (Scarab-only at this point.)
                narrative += ".";
            }

            // Was the attack lethal?
            if (defendingRobot.hitpoints <= 0) {
                // TODO: Add fun little descriptions based on the weapon that
                // dealt the fatal blow and how much damage was dealt.  For
                // instance, for the EMF, we could have "catches fire and
                // explodes", "disintegrates", and "is <strong>annihilated at
                // the quantum level</strong>".
                narrative += String.format("<br />The <span class='enemy name'>{0}</span> {1}",
                                           defendingRobot.longName,
                                           "is <strong>destroyed</strong>");

                // Is that it for the enemy's alliance?
                let robots = controller.getGameRobots(defendingRobot.faction);
                let factionIsStillAlive = false;
                for (let i = 0; i < robots.length; ++i) {
                    if (robots[i].hitpoints > 0) {
                        factionIsStillAlive = true;
                        break;
                    }
                }

                if (!factionIsStillAlive) {
                    narrative += String.format(", and {0} {1} <strong>swept from the battlefield</strong>.",
                                              robots[0].faction,
                                              (controller.isFactionNameSingular(robots[0].faction) ? "is" : "are"));
                } else {
                    narrative += ".";
                }
            }

        } // end (if the final damage dealt was greater than 0)

        return narrative;
    };


    // Tells the human player what to do next, or performs an attack if the
    // human has provided enough information for us to do so.
    //
    // This function is called by the radio button onclick handlers for the
    // weapon arsenal rows and the enemy robot divs.
    //
    // Via createAdvanceTurnOnClickHandler(), this function is also called at
    // the end of AI players' turns.
    //
    this.showNextDialogOrAdvanceTurn = function() {

        if (!controller.isGameInProgress()) {
            return;
        }

        let currentFactionName = controller.getCurrentRobot().faction;
        let currentFactionType = controller.getFactionType(currentFactionName);
        let currentFactionIcon = controller.getFactionIcon(currentFactionName);
        if (currentFactionType === "") {

            console.error("PlainView.showNextHumanPlayerTurnDialog(): Internal " +
                          "error: can't find a faction with the name \"" +
                          currentFactionName + "\", but we know it's there.");
            return;

        } else if (currentFactionType !== "human") {

            // If the current player's not a human being, then never mind.
            console.warn("PlainView.showNextHumanPlayerTurnDialog(): Warning:" +
                         " We have been asked to show a human player dialog" +
                         " during an AI player's turn.  Ignoring this" +
                         " request.");
            return;
        }

        if (controller.getCurrentRobot().hasAmmo() === false) {

            // If you're out of ammo, obviously you can't select anything.
            //
            // AI players that are out of ammo pop up a dialog stating that
            // they skip their turn before making it here.  Here is the human
            // player equivalent.

            console.debug("The human-controlled %s %s is out of ammunition.  Displaying out-of-ammo dialog.",
                          controller.getCurrentRobot().longName,
                          controller.getCurrentRobot().id);
            let dialog = this.addDialog("generic", "30%", "15%", "40%", "",
                                        0, true);
            dialog.querySelector(".title").textContent = "Damage Report";

            let p = document.createElement("p");
            p.setAttribute("class", "narrative");
            p.innerHTML = String.format("With no ammunition remaining, the <span class='name'>{0}</span> <strong class='enemy'>passes</strong>.",
                                        controller.getCurrentRobot().longName);
            let textCell = dialog.querySelector(".text");
            textCell.textContent = "";
            textCell.appendChild(p);

            dialog.style.display = "block";

            // Clicking on the dialog (or the overlay) activates the next turn.
            dialog.onclick = null;
            dialog.querySelector(".overlay").onclick = this.createAdvanceTurnOnClickHandler(this, dialog.id);

        } else if (controller.getCurrentRobotWeapon() === null &&
                   controller.getCurrentRobotEnemy() === null) {

            // We don't have any of our critical data.  That's our signal that
            // the turn has just begun.
            let dialog = this.addDialog("turn", "35%", "5%", "30%", "15%", 1500,
                                        true);
            dialog.querySelector(".logo").style.backgroundImage = "url(\"" +
                currentFactionIcon + "\")";
            dialog.setAttribute("class", "dialog turn small");
            dialog.querySelector(".title").style.display = "block";
            dialog.querySelector(".title h2").textContent = currentFactionName;
            dialog.querySelector(".text").textContent = "It's your turn.";
            dialog.style.display = "block";

        } else if (controller.getCurrentRobotWeapon() === null) {

            // We're still missing a weapon to shoot.

            let dialog = this.addDialog("small", "45%", "10%", "10%", "2em",
                                        1500, true);
            dialog.setAttribute("class", "dialog small green");
            dialog.querySelector(".content").textContent = "Select a weapon to fire.";
            dialog.style.display = "block";

        } else if (controller.getCurrentRobotEnemy() === null) {

            // We're still missing an enemy to shoot.

            let dialog = this.addDialog("small", "45%", "10%", "10%", "2em",
                                        1500, true);
            dialog.setAttribute("class", "dialog small green");
            dialog.querySelector(".content").textContent = "Select an enemy to attack.";
            dialog.style.display = "block";

        } else {

            // The human has given us everything we need.  ATTACK!
            let theGoodGuy = controller.getCurrentRobot();
            let theGoodGuyWeapon = controller.getCurrentRobotWeapon();
            let theBadGuy = controller.getCurrentRobotEnemy();
            let o = controller.attackCurrentEnemy();

            let dialog = this.addDialog("generic", "30%", "15%", "40%", "",
                                        0, true);
            dialog.querySelector(".title").textContent = "Damage Report";

            let p = document.createElement("p");
            p.setAttribute("class", "narrative");
            p.innerHTML = this.weaveNarrative(o.damageReport, theGoodGuy, theGoodGuyWeapon, theBadGuy);
            let textCell = dialog.querySelector(".text");
            textCell.textContent = "";
            textCell.appendChild(p);
            textCell.appendChild(o.damageReportDOM);

            dialog.style.display = "block";

            // Make the board show what the user has done.
            this.updateRobots();

            // Sprite effects are best done after the robot divs have adjusted
            // in size.
            this.explodeWeapon(theBadGuy, theGoodGuy, theGoodGuyWeapon, o.damageReport);
            if (theBadGuy.hitpoints <= 0) {

                this.explodeRobot(theBadGuy);

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
                this.explode(theBadGuy, "jump", smokeDurationMilliseconds, jumpDurationMilliseconds);
            }


            // Clicking on the dialog (or the overlay) activates the next turn.
            dialog.onclick = null;
            dialog.querySelector(".overlay").onclick = this.createAdvanceTurnOnClickHandler(this, dialog.id);
        }
    };


    // This function creates and returns an onclick handler that, when
    // run, updates the UI and advances the game to the next turn, whether
    // that is a human player or a CPU.
    //
    // The dialogId must be the ID of the dialog which was ultimately
    // responsible for getting this function called; our job is to remove that
    // dialog, it having now served its purpose.
    //
    // The turnsToAutomate argument, which defaults to 0, exists only for the
    // benefit of AiPlayer.play().  If it is a positive number, it causes
    // causes an AiPlayer to execute the next turn regardless of the faction
    // type (ordinarily, human faction types cause human dialogs to appear and
    // make the game wait for human input.)  The turnsToAutomate argument is
    // passed verbatim into AiPlayer.playOneRound(), which decreases its value
    // by 1 and sets this function up to be called again.  This "recursive"
    // behavior allows the computer to take over the entire game for a given
    // number of rounds.
    //
    // Remember, this function is not the onclick handler itself -- it
    // generates one.
    this.createAdvanceTurnOnClickHandler = function(view, dialogId, turnsToAutomate) {
        return function() {
            turnsToAutomate = turnsToAutomate || 0;

            // Just in case we're the handler for a dialog and there's no
            // onclick handler on us for whatever reason, we can take care of
            // removing ourselves.
            let index = PlainView.dialogIdStack.indexOf(dialogId);
            if (index > -1) {
                view.removeDialog(dialogId);
            }

            if (!controller.isGameInProgress()) {

                // The previous player just won the game!
                view.checkForEndgame();

            } else {

                let currentEnemy = controller.getCurrentRobotEnemy();
                let currentWeapon = controller.getCurrentRobotWeapon();
                if (currentWeapon === null || currentEnemy === null) {
                    let factionType = controller.getFactionType(controller.getCurrentRobot().faction);
                    if (factionType === "human" && controller.getCurrentRobot().hasAmmo() === true) {
                        // The current robot -- a *human* -- hasn't had an
                        // opportunity to play yet, even though it can.
                        //
                        // We shouldn't have been called at all, but the
                        // double-onclick bug being flaky as it is, the best
                        // solution is to just handle this gracefully and move
                        // on.
                        console.warn(String.format("(Previous player is not waiting for current player's turn.  Double OnClick?  Bad show all the same.  Removed dialogId = {0})", dialogId));
                        return;
                    }
                }

                if (controller.getCurrentRobot().hasAmmo()) {
                    // Deselect, or else the human player code will misinterpret an
                    // attack decision as having already been made.
                    view.selectCurrentRobotWeapon(controller.getCurrentRobot(), currentWeapon.internalName, false);
                    view.selectEnemyRobot(currentEnemy, false);
                }

                controller.nextRobot();
                view.updateRobots();

                if (controller.getFactionType(controller.getCurrentRobot().faction) === "human" && turnsToAutomate <= 0) {
                    // If the now-current player is a human, show the next
                    // dialog the human should see (namely, the "it's your
                    // turn now" dialog.)
                    view.showNextDialogOrAdvanceTurn();
                } else {
                    // Either the now-current player is an AI or the game is
                    // in AI-takeover mode (AiPlayer.PlayStyleNormal.)  Either
                    // way, let an AI player handle the next turn.
                    let aiPlayer = new AiPlayer(controller, view);
                    aiPlayer.playOneRound(true, turnsToAutomate);
                }

            } // end (if the game isn't over yet)
        };
    };


    // Just a little function to animate special final explosions for
    // different robot classes.  Expect the robot image to vanish after this
    // function is called.
    //
    // The only reason this exists is so I don't have to repeat myself between
    // the human and AiPlayer code.
    this.explodeRobot = function(robot) {
        switch(robot.class) {
            case "light":
                this.explode(robot, robot.class, 10 * 1000, 2500);
                break;
            case "medium":
                this.explode(robot, robot.class, 20 * 1000, 2000);
                break;
            case "heavy": case "assault":
                this.explode(robot, robot.class, 30 * 1000, 5000);
                break;
            default:
                this.explode(robot, robot.class, 0, 1000);
                break;
        }

        // Resize the robots...but later.
        let that = this;
        window.setTimeout(function() {
            // Since a robot dying can cause the faction divs to resize, we
            // need to schedule our robot update (which can resize the robot
            // in response to faction div size changes) to occur after the
            // computed style of the faction divs has actually changed.
            //
            // That's right: this setTimeout() call is compensating for the
            // _purely decorative_ CSS transition animation for the ".faction"
            // class by waiting for it to complete.
            let robots = controller.getGameRobots();
            for (let i = 0; i < robots.length; ++i) {
                recalculateImageHeight(robots[i]);
            }
        }, 7000);
    };

    // The only reason this is here is so that I only have to implement the
    // weapon explosion launching code once.  (You'll note this is a public
    // function of the PlainView instance, so an AiPlayer can call it, too.)
    this.explodeWeapon = function(theirRobot, ourRobot, ourWeapon, ourDamageReport) {
        if (!ourWeapon.explosion) {
            // Our weapon doesn't have an explosion animation.
            return;
        }
        if (ourDamageReport.originalDamage.damage <= 0) {
            // Our weapon misfired.
            return;
        }
        if (ourDamageReport.jumped === true &&
            ourDamageReport.jumpDamage.damage >= ourDamageReport.originalDamage.damage) {
            // Their robot dodged the attack by jumping.
            return;
        }

        // If control made it here, our weapon at least _connected_ (whether
        // it dealt any damage is another question entirely.)
        //
        // All weapons of the same type are fired simultaneously, so they
        // should explode simultaneously.
        let matchingWeapons = ourRobot.findWeapons(ourWeapon.internalName);
        if (matchingWeapons.length === 0) {
            // Just ran out of ammo this round.
            let tempRobot = new Robot(ourRobot.internalName);
            matchingWeapons = tempRobot.findWeapons(ourWeapon.internalName);
            tempRobot.unregister();
        }

        for (let i = 0; i < matchingWeapons.length; ++i) {
            this.explode(theirRobot,
                         ourWeapon.explosion,
                         0,
                         ourWeapon.duration !== undefined ? ourWeapon.duration : 1000);
        }
    };


    // Returns an onclick handler that, when called, returns to the game
    // select screen.
    //
    // This function makes the liberal assumption that there exists a global
    // Game object called "g" which manages the Select screen.  One such
    // object (in fact, the only one) can be found in Game.html.
    this.createEndgameOnClickHandler = function(view, dialogId) {
        return function() {
            // Just in case we're the handler for a dialog and there's no
            // onclick handler on us for whatever reason, we can take care of
            // removing ourselves.
            let index = PlainView.dialogIdStack.indexOf(dialogId);
            if (index > -1) {
                view.removeDialog(dialogId);
            }
            view.hide();
            g.select().show();
        };
    };


    // Shows the endgame success or failure dialog if a player won the game
    // (regardless of whether that player is human or AI.)
    this.checkForEndgame = function() {
        if (controller.isGameInProgress()) {
            return;
        }

        // The game's over!

        // If the dialog mentions the losing factions, we want to be
        // ready.
        let factions = controller.getGameFactions();
        let winningFaction = controller.winningFaction();
        let losingFactions = [];
        let losingFactionString = "";
        for (let i = 0; i < factions.length; ++i) {
            if (factions[i] !== winningFaction) {
                if (factions[i] === "The Prime Edict") {
                    factions[i] = "The Edict"; // Refer to them by their in-story shorthand.
                }
                losingFactions.push(factions[i]);
            }
        }
        if (losingFactions.length == 1) {
            losingFactionString = String.format("<span class='enemy name'>{0}</span>", losingFactions[0]);
        } else if (losingFactions.length == 2) {
            losingFactionString = String.format("<span class='enemy name'>{0} and <span class='enemy name'>{1}</span>",
                                                losingFactions[0],
                                                losingFactions[1]);
        } else {
            for (let i = 0; i < losingFactions.length - 1; ++i) {
                losingFactionString += String.format("<span class='enemy name'>{0}</span>, ",
                                                     losingFactions[i]);
            }
            losingFactionString += String.format("and <span class='enemy name'>{0}</span>", losingFactions[losingFactions.length - 1]);
        }


        // Show the final dialog.
        let dialog = this.addDialog("endgame", "25%", "12%", "50%", "75%", 0, true);
        let nodeList = dialog.querySelectorAll(".enemy.name");
        for (let i = 0; i < nodeList.length; ++i) {
            nodeList[i].outerHTML = losingFactionString;
        }

        let humanWon = (controller.getFactionType(controller.winningFaction()) === "human");
        if (humanWon) {

            // If a human won, we _always_ show a "victory"-type dialog.
            dialog.setAttribute("class", "endgame dialog green");
            let content = dialog.querySelector(".content.success");
            content.style.background =
                String.format("url('{0}') 50% 50% / contain no-repeat, url('{1}') 50% 50% / cover no-repeat",
                              controller.getFactionIcon(controller.winningFaction()),
                              "./assets/images/backgrounds/[CC0] Rawdanitsu - Another Space Backgrounds (space-background-10) [OpenGameArt]-85%25.jpg");
            content.style.display = "block";

            // The dead do not receive the glory.
            this.removeDeadRobots(controller.winningFaction());

        } else {

            // If only AI players are running, then show the success
            // dialog.  But if there's even one human player, then
            // quite frankly, we expected them to win.

            let atLeastOneHumanWasPlaying = false;
            let factions = controller.getGameFactions();
            for (let i = 0; i < factions.length; ++i) {
                if (controller.getFactionType(factions[i]) === "human") {
                    atLeastOneHumanWasPlaying = true;
                }
            }

            if (atLeastOneHumanWasPlaying) {

                // At least one human lost the match.  Show the defeat dialog.
                dialog.setAttribute("class", "endgame dialog red");
                let overlay = dialog.querySelector(".overlay");
                overlay.setAttribute("class", "overlay failure");
                overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                let content  = dialog.querySelector(".content.failure");
                content.style.background =
                    String.format("url('{0}') 50% 50% / contain no-repeat, url('{1}') 50% 50% / cover no-repeat",
                                  controller.getFactionIcon(controller.winningFaction()),
                                  "./assets/images/backgrounds/[CC0] Cuzco - Space background (bg5) [OpengameArt]-85%25.jpg");
                content.style.display = "block";
            } else {

                // A computer won a computer-only match.  Show the victory dialog.
                dialog.setAttribute("class", "endgame dialog green");
                let content = dialog.querySelector(".content.success");
                content.style.background =
                    String.format("url('{0}') 50% 50% / contain no-repeat, url('{1}') 50% 50% / cover no-repeat",
                                  controller.getFactionIcon(controller.winningFaction()),
                                  "./assets/images/backgrounds/[CC0] Rawdanitsu - Another Space Backgrounds (space-background-10) [OpenGameArt]-85%25.jpg");
                content.style.display = "block";
            }
        }

        // The onclick will call updateRobots(), which will finally
        // sweep the dead faction from the board.  All that's left for
        // us it marking the winning faction.
        let factionDiv = document.getElementById(id(controller.winningFaction()));
        if (factionDiv) {
            factionDiv.setAttribute("class", factionDiv.getAttribute("class") + " success");
        }

        // Clicking on this final dialog automatically returns to the game setup screen.
        let dialogId = dialog.getAttribute("id");
        dialog.querySelector(".overlay").onclick = this.createEndgameOnClickHandler(this, dialogId);

        window.setTimeout(function() {
            // Wait a short time for the content switch to take place before rendering.
            dialog.style.display = "block";
        }, 30);
    };

    return this;
}
