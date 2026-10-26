# Start here: CinderDeep 3D

This repository also contains a large catalog of unrelated upstream projects. The game workspace is isolated here:

- Workspace to open in your local AI: projects/cinderdeep-3d/
- Read first: projects/cinderdeep-3d/AGENTS.md
- Game design source of truth: projects/cinderdeep-3d/GAMEPLAY_SPEC.md
- Step-by-step prompts: projects/cinderdeep-3d/LOCAL_AI_GUIDE.md

The game is being rebuilt from a clean codebase. The folder contains the game brief and a small npm manifest for Three.js, GSAP, and Vite. It contains no old Cinderdeep game source or assets. Do not initialize or edit the upstream catalog submodules.

Paste this into your local AI after opening projects/cinderdeep-3d as its workspace:

~~~text
Read AGENTS.md, GAMEPLAY_SPEC.md, and LOCAL_AI_GUIDE.md completely. Build CinderDeep as a fresh 3D browser game in this workspace, following the specification. Do not stop after giving me a plan: implement the game in small working stages, use Three.js for the actual 3D world and GSAP in visible gameplay/UI animation, run the build and fix errors, and keep working until the acceptance checklist in AGENTS.md is met. Do not copy old game source or assets from elsewhere in the repository.
~~~
