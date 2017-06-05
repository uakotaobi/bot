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

/////////////////////////////////////////////////////////////////////////////////
// A sprite is effectively an array of images with timing and position         //
// information.  Having just one image is quite acceptable.                    //
//                                                                             //
// Width and Height are the starting width and height of the sprite in pixels. //
/////////////////////////////////////////////////////////////////////////////////

// All sprites, whether they are animated or not, are really instances of the
// SpriteBase object.  It's the type that does the actual work.
//
// The width and the height must be in pixels.
function SpriteBase(width, height) {

    // -----------------------------------------------------------------------
    // Static variables (class-level.)

    if (!SpriteBase.hasOwnProperty("counter")) {
        SpriteBase.counter = 0;
    }

    // -----------------------------------------------------------------------
    // Public static functions (class-level.)

    if (!SpriteBase.hasOwnProperty("preloadImages")) {
        SpriteBase.preloadImages = function() {

            let startTimeMilliseconds = Date.now();

            // At the time of writing, there are 3 fire sprites and 16
            // explosion sprites.  But it helps to overplan.
            const fireSprites = 20;
            const explosionSprites = 40;
            let sprites = [];

            for (let i = 1; i <= fireSprites; ++i) {
                let sprite = SpecialEffectSprite(String.format("f{0}", i));
                if (sprite.totalFrames() > 0) {
                    sprite.preload();
                    sprites.push(sprite);
                }
            }
            for (let i = 1; i <= explosionSprites; ++i) {
                let sprite = SpecialEffectSprite(String.format("e{0}", i));
                if (sprite.totalFrames() > 0) {
                    sprite.preload();
                    sprites.push(sprite);
                }
            }

            let checkSpriteImagePreloadingProgress = function() {
                let fullyLoadedSprites = 0;
                for (let i = 0; i < sprites.length; ++i) {
                    if (sprites[i].preload() >= 1) {
                        fullyLoadedSprites += 1;
                    }
                }

                if (fullyLoadedSprites < sprites.length) {
                    window.setTimeout(checkSpriteImagePreloadingProgress, 100);
                } else {
                    console.debug("SpriteBase.preloadImages/checkSpriteImagePreloadingProgress(): All %d effects sprite(s) loaded in %.2f seconds.",
                                  fullyLoadedSprites,
                                  (Date.now() - startTimeMilliseconds)/1000.0);
                }
            };

            window.setTimeout(checkSpriteImagePreloadingProgress, 100);
        };
    }

    // -----------------------------------------------------------------------
    // Private variables (closure-local.)

    let frames = [];
    let startTimeMilliseconds = Date.now();
    let id = SpriteBase.counter++;
    let done = false;

    // -----------------------------------------------------------------------
    // Public member variables.
    //
    // I've tried to give these sensible defaults where possible.


    // How non-transparent we are.  A value of 0.0 means fully transparent.
    this.opacity = 1.0;

    // If true, we repeat our animation cycle when we get to the end of it.
    // If set to false, our animation cycle will stay on the last frame once
    // we reach it.
    //
    // Note that this.framesPerSecond must also be greater than 0 or else
    // animation will be stuck on frame 0 and we won't animate at all.
    this.loop = true;

    // The position of the sprite relative to whatever the view thinks its
    // default position should be.
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;

    // The layer translates to the sprite's Z-index in the PlainView.
    this.layer = 0;

    // The speed of the animation, if any.
    //
    // Warning: animated sprites _require_ that this variable be set.  If this
    // is left at its default of 0, the sprite will always remain on frame 0
    // and no animation will occur.
    this.framesPerSecond = 0;


    // Stop animating after this many frames of animation have cycled.  This
    // is normally determined by automatically by maxAgeMilliseconds, but you
    // can set a different value.
    //
    // The default of 0 means there is no maximum frame count.
    this.maxFrameCount = 0;

    // Stop animating after this many seconds have elapsed.  The default of 0
    // means that there is no maximum age.
    this.maxAgeMilliseconds = 0;

    // Don't start animating until this many seconds have elapsed.  The
    // default of 0 means that animation starts immediately.
    this.delayMilliseconds = 0;


    // -----------------------------------------------------------------------
    // Public member functions.


    // Retrieves a read-only copy of this sprite's ID.
    this.id = function() { return id; };


    // Utility function: loads the frames of the sprite into an in-memory
    // Image object so that they can be cached by the web browser.
    //
    // Returns a floating-point value indicating what percentage of our images
    // are loaded.  Calling this function repeatedly is safe.
    let preloadedImages = [];
    this.preload = function() {
        if (preloadedImages.length === 0) {
            // This will only happen once.
            let imageNameTable = { };
            for (let i = 0; i < frames.length; ++i) {
                if (!(frames[i].image in imageNameTable)) {
                    // Only unique image names get preloaded.  (Otherwise,
                    // we'd have a devil of a time with sprite sheets.)
                    imageNameTable[frames[i].image] = true;
                    let image = new Image();
                    image.src = frames[i].image;
                    preloadedImages.push(image);
                }
            }
        }

        let successfullyPreloadedImageCount = 0;
        for (let i = 0; i < preloadedImages.length; ++i) {
            if (preloadedImages[i].complete) {
                successfullyPreloadedImageCount++;
            }
        }
        return successfullyPreloadedImageCount / preloadedImages.length;
    };


    // Add a single frame of animation from a stand-alone image.
    //
    // If you don't call either this or addFramesFromSpriteSheet(), your
    // sprite will be totally worthless.
    this.addFrame = function(imagePath) {
        frames.push({
            image: imagePath,
            xOffset: 0,
            yOffset: 0
        });
    };


    // Adds frames of animation from a sprite sheet.
    //
    // We only understand sprite sheet images that are ordered in increasing
    // sequence by column then by row (in other words, one would read the
    // sprite sheet images the same way they would read words on a page.)
    this.addFramesFromSpriteSheet = function(spriteSheetPath, spriteSheetRows, spriteSheetColumns) {

        // We presume that the caller was honest when they constructed us with
        // the right width and height for the individual sprites (*not* the
        // width and height of the spritesheet.)
        for (let yOffset = 0; yOffset < spriteSheetRows * height; yOffset += height) {
            for (let xOffset = 0; xOffset < spriteSheetColumns * width; xOffset += width) {
                frames.push({
                    image: spriteSheetPath,
                    xOffset: xOffset,
                    yOffset: yOffset
                });
            }
        }
    };


    // Query: how many frames of animation do we have?
    this.totalFrames = function() { return frames.length; };


    // Query: how old is this sprite?
    this.ageInMilliseconds = function() { return Date.now() - startTimeMilliseconds; };


    // Query: Is this sprite done being animated?  Is it ready to be removed?
    this.finished = function() { return done; };


    // Tell the sprite to cease being rendered or animated.
    //
    // Callbacks will cease to occur on the sprite and it will cleanly
    // unregister from the views it was added to.
    this.stop = function() { done = true; };

    // Start up animation and display on the sprite again.
    //
    // You'll probably need to re-add it to any views that expunged it,
    // though.
    this.resume = function() { done = false; };

    // Get the current frame of animation based on the sprite's age.
    //
    // Returns an object with the following fields:
    // - image: The path to the current frame's sprite image.
    // - xOffset: The X offset within the current sprite image.  This varies
    //            for sprite sheets but is always 0 for full image animations.
    //            Be prepared to deal with both.
    // - yOffset: The Y offset within the current sprite image.  Again, this
    //            is non-zero only for sprite sheets.
    this.getCurrentFrame = function() {
        if (frames.length === 0) {
            console.error("SpriteBase.getCurrentFrame(): Error: Attempted to obtain the current frame for a sprite without any frames in it yet.");
            return null;
        }

        let ageInMilliseconds = this.ageInMilliseconds();

        // Don't start animating until the delay has passed.
        if (this.ageInMilliseconds() < this.delayMilliseconds) {
            ageInMilliseconds = 0;
        } else {
            ageInMilliseconds = this.ageInMilliseconds() - this.delayMilliseconds;
        }

        // Stop animating if we've timed out.
        if (this.maxAgeMilliseconds > 0 && ageInMilliseconds > this.maxAgeMilliseconds) {
            ageInMilliseconds = this.maxAgeMilliseconds;
            done = true;
        }

        let elapsedFrames = Math.floor(this.framesPerSecond * ageInMilliseconds/1000);

        // Stop animating if we've surpassed our maximum frame.
        if (this.maxFrameCount > 0 && elapsedFrames > this.maxFrameCount) {
            elapsedFrames = this.maxFrameCount;
            done = true;
        }

        if (this.loop === true) {
            // After the last frame, go back to the first.
            return frames[elapsedFrames % frames.length];
        } else {
            // Keep returning the last frame repeatedly after we reach it (at
            // least until we time out.)
            return frames[Math.min(elapsedFrames, frames.length - 1)];
        }
    };


    // The views each have their own notion of how to update a sprite.  When
    // they do decide to update us, they will call the sprite's update()
    // function in order to perform any necessary non-animation-related work,
    // such as moving the sprite or fading away.  "Derived" sprite objects can
    // override this method if they like; the base class version does nothing.
    this.update = function() {
    };

    return this;
}

// Constructs your basic single-frame sprite.
//
// Thanks to sensible defaults, there's not much for this function to do.
function Sprite(width, height, imagePath) {
    var that = new SpriteBase(width, height);

    that.addFrame(imagePath);

    return that;
}


// Creates a special effect sprite by name.  Sensible defaults are chosen when
// the effect is created; you can override these if needed.
function SpecialEffectSprite(effectName) {

    switch(effectName) {
        // 128x256, 32 frames, thin column of flame.  Resembles a torch.  The
        // actual fire itself is roughly 56x226 placed at the bottom center,
        // to be sure to place the fire's upper-left corner at:
        //
        //   x = WIDTH/2 + (56-128)/2     = WIDTH/2 - 72
        //   y = HEIGHT - 256 + (256-226) = HEIGHT - 226
        case "f1":
        {
            let sprite = new SpriteBase(128, 256);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] Soluna Software - Explosion effects and more (Fire01) [OpenGameArt].png", 4, 8);
            sprite.framesPerSecond = 30;
            return sprite;
        }
        // 81x123, 40 frames; short, detailed flame (forward version).  A decent
        // campfire, but it's no conflagration.
        case "f2":
        {
            let sprite = new SpriteBase(81, 123);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/fire_1f-40-frames-81x123.png", 5, 8);
            sprite.maxAgeMilliseconds = 15000;
            sprite.framesPerSecond = 20;
            return sprite;
        }
        // 256x256, 50 frames; high-resolution, very detailed flame.  This is
        // the best fire animation I currently have.
        //
        // The author actually has animations of this same fire with 75
        // frames, but that is a single 3MB sprite sheet, so disk space
        // becomes an issue in that case.
        case "f3":
        {
            let sprite = new SpriteBase(256, 256);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/FireLoop1-50-frames-256x256.png", 10, 5);
            sprite.framesPerSecond = 30;
            sprite.maxAgeMilliseconds = 15000;
            return sprite;
        }
        // 128x128, 16 frames; brighter, spherical blast.  The most realistic
        // of the short blasts.
        case "e1":
        {
            let sprite = new SpriteBase(128, 128);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] [CC-BY-3.0] Soluna Software - Explosion effects and more (Explosion03) [OpenGameArt].png", 4, 4);
            sprite.loop = false;
            sprite.maxFrameCount = 16;
            sprite.framesPerSecond = 15;
            return sprite;
        }
        // 128x128, 16 frames; duller and baser spherical blast.
        case "e2":
        {
            let sprite = new SpriteBase(128, 128);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] [CC-BY-3.0] Soluna Software - Explosion effects and more (Explosion21) [OpenGameArt].png", 4, 4);
            sprite.loop = false;
            sprite.maxFrameCount = 16;
            sprite.framesPerSecond = 15;
            return sprite;
        }
        // 128x128, 16 frames; bright flash then a fading fireball, spherical blast.
        case "e3":
        {
            let sprite = new SpriteBase(128, 128);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] Soluna Software - Explosion effects and more (Explosion25) [OpenGameArt].png", 4, 4);
            sprite.loop = false;
            sprite.maxFrameCount = 16;
            sprite.framesPerSecond = 15;
            return sprite;
        }
        // 128x128, 64 frames; a somewhat pixelated piece of exploding popcorn.
        case "e4":
        {
            let sprite = new SpriteBase(128, 128);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] StumpyStrust - Explosion Sheet (boom3) [OpenGameArt].png", 8, 8);
            sprite.loop = false;
            sprite.maxFrameCount = 64;
            sprite.framesPerSecond = 25;
            return sprite;
        }
        // 64x64, 16 frames; a hot, fiery piffle that suddenly dissipates.
        // This is a remix of Cuzco's original explosion -- it features softer
        // edges and looks less jarring.
        case "e5":
        {
            let sprite = new SpriteBase(64, 64);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] Cuzco and Charlie - Explosion with alpha (exp2_alpha_1) [OpenGameArt].png", 4, 4);
            sprite.loop = false;
            sprite.maxFrameCount = 16;
            sprite.framesPerSecond = 15;
            return sprite;
        }
        // 256x256, 64 frames; big, bright, detailed, and spherical.
        // This is the best explosion I currently have.
        case "e6":
        {
            let sprite = new SpriteBase(256, 256);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] elmineo - Explosion Tilesets (Explosion_001_Tile_8x8_256x256) [OpenGameArt].png", 8, 8);
            sprite.loop = false;
            sprite.maxFrameCount = 64;
            sprite.framesPerSecond = 25;
            return sprite;
        }
        // 256x256, 64 frames; a detailed poof of fire and dust.
        // This is the second-best explosion.
        case "e7":
        {
            let sprite = new SpriteBase(256, 256);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] elmineo - Explosion Tilesets (Explosion_002_Tile_8x8_256x256) [OpenGameArt].png", 8, 8);
            sprite.loop = false;
            sprite.maxFrameCount = 64;
            sprite.framesPerSecond = 25;
            return sprite;
        }
        // 256x256, 64 frames; a smaller variation of the e7 blast, and just as detailed.
        // This is the third-best explosion.
        case "e8":
        {
            let sprite = new SpriteBase(256, 256);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] elmineo - Explosion Tilesets (Explosion_003_Tile_8x8_256x256) [OpenGameArt].png", 8, 8);
            sprite.loop = false;
            sprite.maxFrameCount = 64;
            sprite.framesPerSecond = 25;
            return sprite;
        }
        // 320x320, 9 frames; a rapid warp flash effect not originally
        // intended for explosions.  Too bad!
        case "e9":
        {
            let sprite = new SpriteBase(320, 320);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC-BY-3.0] [GPL-3.0] Skorpio - Warp effect 2 (Warp_effect2C) [openGameArt]-9-frames-320x320 [OpenGameArt].png", 3, 3);
            sprite.loop = false;
            sprite.maxFrameCount = 9;
            sprite.framesPerSecond = 36;
            return sprite;
        }
        // 128x128, 16 frames: an expanding ring of blue smoke.
        case "e10":
        {
            let sprite = new SpriteBase(128, 128);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/[CC0] [CC-BY-3.0] Soluna Software - Explosion effects and more (Effect95) [OpenGameArt].png", 4, 4);
            sprite.loop = false;
            sprite.maxFrameCount = 16;
            sprite.framesPerSecond = 30;
            return sprite;
        }
        // 100x100, 30 frames: Burns fiery and hot before quickly turning
        // into rising soot and ash.
        case "e11":
        {
            let sprite = new SpriteBase(100, 100);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/exports_0-30-frames-100x100 (tests).png", 3, 10);
            sprite.loop = false;
            sprite.maxFrameCount = 30;
            sprite.framesPerSecond = 30;
            return sprite;
        }
        // 100x100, 60 frames: Irregularly-shaped blasts that burn fiery and
        // hot before quickly turning into rising soot and ash.  It will be
        // tough for the viewer to distinguish these (which is a good thing.)
        case "e12":
        case "e13":
        case "e14":
        {
            let filename = "";
            switch(effectName) {
                case "e12": filename = "exports_0-60-frames-100x100 (test4).png"; break;
                case "e13": filename = "exports_0-60-frames-100x100 (test5).png"; break;
                case "e14": filename = "exports_0-60-frames-100x100 (test6).png"; break;
            }
            let sprite = new SpriteBase(100, 100);
            sprite.addFramesFromSpriteSheet(String.format("./assets/images/effects/{0}", filename), 6, 10);
            sprite.loop = false;
            sprite.maxFrameCount = 60;
            sprite.framesPerSecond = 30;
            return sprite;
        }
        // 100x100, 81 frames: Burns fiery and hot, spewing about, before
        // quickly turning into rising soot and ash.
        //
        // Honestly, this is the best and most detailed version of
        // StumpyStrust's export_0 "More Explosions" pack, and all of the
        // e11-e16 explosions could be replaced with this.  However, variety
        // is the spice of life.
        case "e15":
        {
            let sprite = new SpriteBase(100, 100);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/exports_0-81-frames-100x100 (test).png", 9, 10);
            sprite.loop = false;
            sprite.maxFrameCount = 81;
            sprite.framesPerSecond = 30;
            return sprite;
        }
        // 100x100, 94 frames: Burns fiery and hot before quickly turning
        // into rising soot and ash.  The soot and ash itself spews about for
        // a short time before vanishing.
        case "e16":
        {
            let sprite = new SpriteBase(100, 100);
            sprite.addFramesFromSpriteSheet("./assets/images/effects/exports_0-94-frames-100x100 (test3).png", 10, 10);
            sprite.loop = false;
            sprite.maxFrameCount = 94;
            sprite.framesPerSecond = 30;
            return sprite;
        }
        default:
        {
            // Almost surely not what you want.
            // console.warn("SpecialEffectSprite(): Unrecognized effectName '{0}'.", effectName);
            return new SpriteBase(1, 1);
        }
    }
}

(function() {
    new SpriteBase(); // Force the preloadImages() function to poof into existence.
}());
