# TODO.md

- astro migration
- put pages in url so it's not always just one url
- fix sharing for robot swarms (generate url?)

## active membranes SUCK rn
- make active mem rules one big textbox (also show rules in latex form as in examples?)
- finding max parallel sets should let you run timestep by step:
- t=0: all possible sets of rules, where for each set every rule can be applied in parallel (no clash) and there are no other rules leftover that could aslo be applied (maximal)
- t=1: ...
- so output is a list of timesteps below with different sets. would be good to represent as a tree the user can interact with to see the different options