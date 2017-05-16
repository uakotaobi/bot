# Bot

Bot is a JavaScript conversion of a decades-old paper-and-pencil game I played
as a child.  You probably shouldn't take it too seriously.

To play, just download the code locally using your favorite method and point
your browser at index.html, or visit https://uakotaobi.github.io/bot/ to play
the online version.

A full list of credits can be found in about.html#credits.

## Sprites too small when the game starts?

This is a known problem.  Click on a bad guy or click on a weapon to resize
the sprite images.

## Fun with the JavaScript Debugger

After you start a game, hit F12 or whichever key combination enables the
JavaScript console on your web browser.

1. Make the computer play for you:
   1. Create a stateless AI player object:
      ```javascript
      a = new AiPlayer("The Star Alliance", g.controller(), g.view());
      ```
   2. During your turn:
      ```javascript
      a.playOneRound(true);
      ```

2. Ask the computer whom to shoot:
   1. Create a stateless AI player object:
      ```javascript
      a = new AiPlayer("The Star Alliance", g.controller(), g.view());
      ```
   2. During your turn:
      ```javascript
      response = a.chooseBestAttack(g.controller().getCurrentRobot())

      response.weaponName     // The internal name of the weapon that you should fire
      response.enemy.longName // The name of the robot to shoot at
      response.reasons[0]     // The AI summary in plain language (there can be more than one entry)
      ```

   The computer player's _okay_, though it tends to treat damaged Bots the
   same way a hungry shark treats blood in the water.

3. Test an explosion sequence:
   First, choose a robot.
   ```javascript
   robot = g.controller().getCurrentRobot()                     // The robot whose turn it currently is
   robot = g.controller().getGameRobots()[0]                    // The current game's first still-living robot
   robot = g.controller().getGameRobots()[1]                    // ...second (and so forth)
   robot = g.controller().getGameRobots("The Star Alliance")[0] // That faction's fastest still-living robot
   ```

   Then choose a Bot class and the timing parameters:
   ```javascript
   fireDurationMilliseconds = 10 * 1000;
   explosionDurationMilliseconds = 3 * 1000;
   g.view().explode(robot, "medium", fireDurationMilliseconds, explosionDurationMilliseconds);
   ```

   You can also pass the special string "jump" as the second argument to make
   the robot jump rather than explode.

4. Give yourself unfair reinforcements:

   ```javascript
   robot = new Robot("scarab")
   g.controller().addRobot("The Star Alliance", robot)
   g.view().addRobot(r)
   g.view().updateRobots()
   ```

   You might want to give yourself something more useful than a Scarab.
   * Unless, of course, you give the Scarab itself an unfair weapon:

     ```javascript
     robot.arsenal.push(new Weapon("emf"))
     g.view().updateRobots()
     ```
   * Or just make up a damage string for an existing weapon:

     ```javascript
     robot.arsenal[0].shortName = "BB GUN"
     robot.arsenal[0].dmaage = "5d20"
     g.view().updateRobots()
     ```

     You may find that giving a robot a powerful weapon makes that robot
     seem _a lot more interesting_ to computer opponents than it was
     previously.

## License

This program is released under the GNU GPL, version 3 or later.
