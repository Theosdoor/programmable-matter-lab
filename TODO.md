# TODO.md

- [x] put pages in url so it's not always just one url
- [x] migrate to Astro build/deploy
- [ ] continue shrinking page-local CSS by extracting small Astro components and Tailwind utility layouts

## active membranes SUCK rn
- [x] make active mem rules one big textbox (also show rules in latex form as in examples?)
- [ ] finding max parallel sets should let you run timestep by step:
- t=0: all possible sets of rules, where for each set every rule can be applied in parallel (no clash) and there are no other rules leftover that could also be applied (maximal)
- t=1: ...
- so output is a list of timesteps below with different sets. would be good to represent as a tree the user can interact with to see the different options
