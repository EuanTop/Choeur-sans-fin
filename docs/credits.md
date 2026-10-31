# Credits

- Swan: original procedural model by EuanTop, reused unchanged from Crescent Lake / Around the Bend. No downloaded third-party swan model.
- Duck and cygnets: procedural series character proportions, recreated with articulated geometry.
- Goudy Bookletter 1911: local font; source and SIL Open Font License are included in `public/fonts/`.
- Fluid reveal shader: adapted from Cullen Webber's [three-skull, WebGL branch](https://github.com/cullenwebber/three-skull/tree/webgl), commit `985eb741ecff1d0a0c575a1df92d464b44c3c26d`. Upstream README declares MIT; a separate upstream LICENSE file has not been verified. The shader retains its provenance header. Here its brush follows the lantern, with deterministic fixed-step history and paper/duck silhouette masks.
- Three.js and its bundled Reflector, RoomEnvironment, GLTFLoader and RoundedBoxGeometry: MIT.

The generated concept image is a working reference, stored outside Git in ignored local artifacts. Runtime visuals are rendered from geometry and shaders.
