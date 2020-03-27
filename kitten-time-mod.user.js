// ==UserScript==
// @name         Kittens Game Time Mod
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Tweaks the game rate by a factor of two and causes flux to accumulate while online, using temporal accelerators.
// @author       MercuriusXeno
// @include     *bloodrizer.ru/games/kittens/*
// @include     file:///*kitten-game*
// @include     *kittensgame.com/web/*
// @version     1.4.2
// @grant        none
// ==/UserScript==

// Game will be referenced in loadTest function (stolen from kitten scientists)
var game = null;

// this is the interval in which the flux generator fires (every second)
const fluxGeneratorInterval = 1000;

function getVanillaFluxRate () {
    return game.ticksPerSecond / (60.0 * 1000.0);
};

// global var, progress towards next flux is stored each pass instead of getting rounded/fractionally added to the flux counter.
var fluxProgress = 0;

// we need to prime the flux timestamp with something so it doesn't dump us a zillion flux when we open the game.
var fluxTimestamp = Date.now();

// This is the function we're going to setInterval on. It grants flux as though offline, but only by a margin based on your temporal factor.
// In other words this gives you additively -100% of your normal flux production, meaning you don't get anything if you have no accelerators.
var fluxGenerator = function () {
    var now = Date.now();
    var fluxAccelerators = game.time.getCFU("temporalAccelerator");
    // we only generate flux while time isn't already accelerated.
    // we also don't generate flux if you have no accelerators.
    if (fluxAccelerators === 0 || game.time.isAccelerated) {
        fluxTimestamp = Date.now();
        return;
    }
    var fluxAcceleration = fluxAccelerators.val * game.time.getCFU("temporalAccelerator").effects.timeRatio;
    var delta = now - fluxTimestamp;
    // same formula as the normal rate. It's 5 flux every 60 seconds. But it's a fraction of that, since it's based on how much temporal acceleration you have.
    var fluxGained = (delta * fluxAcceleration) * getVanillaFluxRate();
    // then instead of adding it, it gets added to a progress pool that only gives you flux when it's over a whole number.
    fluxProgress += fluxGained;
    if (fluxProgress >= 1.0) {
        var temporalFluxAdded = this.game.resPool.addResEvent("temporalFlux", Math.floor(fluxProgress));
        fluxProgress -= Math.floor(fluxProgress);
    }
    fluxTimestamp = Date.now();
    // console.log("Now is " + fluxTimestamp);
}

var run = function() {
    console.log("Starting kittens time mods.");
    // doubles the time rate of the vanilla game, from 1 day every 2 seconds to 1 day per second; leaves the tempus fugit ratio (1.5) the same (2:3 instead of 1:1.5)
    // in other words, this hijacks the normal time acceleration ratio function, replacing it with one that yields acceleration +100% at all times (normally) and +200% during acceleration.
    game.timeAccelerationRatio = function () { return this.time.isAccelerated ? 2 : 1; };
    setInterval(fluxGenerator, fluxGeneratorInterval);
};

// unabashedly stolen from the kitten scientists routine, this seemed like a great way to defer loading.
var loadTest = function() {
    if (typeof gamePage === 'undefined') {
        // Test if kittens game is already loaded or wait 2s and try again
        setTimeout(function(){
            loadTest();
        }, 2000);
    } else {
        // Kittens loaded, run the function modifications and setInterval on flux generator.
        // the linter isn't a fan of referencing "gamePage" here, look here if we ever have problems with defered loads; perhaps the object name changed.
        // or just go steal it from kitten scientsts again.
        game = gamePage;
        run();
    }
};

loadTest();
