# 3D models

Exeku ships its own Arduino Uno, breadboard, LED, resistor and wire models (built in code in
`lib/three/circuit.ts`), so nothing here is required.

To use a CAD model instead (for example from GrabCAD):

1. Check the model's license allows you to use and redistribute it in your app.
2. Export or convert it to binary glTF (`.glb`). In Blender: File > Import STEP (or the format you have),
   then File > Export > glTF 2.0 (.glb). From the command line, `pip install cascadio` converts STEP to GLB.
3. Put the file here, for example `public/models/arduino-uno.glb`.
4. Name it in `manifest.json`: `{ "arduino-uno": "arduino-uno.glb", "breadboard": null }`.

The model is rotated if it was exported Z-up, scaled to the real part's width and dropped into the same spot,
so wires still land on the right pins. Keep files small (under 5 MB): decimate in Blender if needed.
