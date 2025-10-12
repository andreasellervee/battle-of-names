## Executive summary

The goal is to create a more visually engaging version of the "Wheel of names". Wheel of names is essentially a name
picking tool, where you enter the names you want to select from and then it randomly chooses one. The visual aspect
is that the wheel is spinning and the contestants have the feeling of hope of their name being selected.

What I want to create is something more visually entertaining. I want to create a free-for-all battle-royal style
scene, where each name is assigned to an object (it can be a stick figure, a random blob, anything basically) and then
you can watch it out how your "name" battles for the last spot. 

It will be fully driven by randomness, and it should last about 10-15 seconds.

### UI

There is a text-box where user can enter names of the contestants. It can be simple, name per row, separated by new line
The text-box should lead to a small 3-2-1 countdown and then all the contestant objects will enter the battle.

Initial version can be a ring or a hexagon and then blobs can battle it out there.

### Mechanics

Initial version mechanics can be that the blobs move around with some sophistication, but if one gets hit 3 times, 
then they are out. The playing area will decrease every 5 seconds. Anyone outside the area has 1 seconds to return into
the play area or they will be removed from the game.


### Outcome

There should be 1 winner who is celebrated in the end and the name displayed out big. There can be an option to
display the full list of all the contestants based on their survival time.


### Technical stuff

Write it using typescript.
There is no need for a database, it should be an easily deployable js application
