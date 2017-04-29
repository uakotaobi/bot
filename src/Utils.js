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

/////////////////////////////////////////////////////////////////
// Utility functions and classes used throughout the codebase. //
/////////////////////////////////////////////////////////////////

// An arbitrary object-cloning function taken from
// http://stackoverflow.com/a/1042676.
//
// extends 'from' object with members from 'to'. If 'to' is null, a deep clone of 'from' is returned
function extend(from, to)
{
    if (from === null || typeof from != "object") return from;

    // This line here disallows the cloning of Robot objects, which is the
    // whole reason I imported extend() in the first place.  I'd like to
    // understand the reasoning behind this logic, because not being able to
    // extend objects with custom constructors sure smells like a bug.
    //
    // if (from.constructor != Object && from.constructor != Array) return from;

    if (from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
        from.constructor == String || from.constructor == Number || from.constructor == Boolean)
        return new from.constructor(from);

    to = to || new from.constructor();

    for (var name in from)
    {
        to[name] = typeof to[name] == "undefined" ? extend(from[name], null) : to[name];
    }

    return to;
}


// A (very simplified) C#-style String.Format()-like function from
// StackOverflow.  The only format specifiers it understands are {0}, {1},
// {2}, and the like.
//
// See http://stackoverflow.com/a/4673436.

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}


// Just returns a random integer between a and b, inclusive.
function random(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
