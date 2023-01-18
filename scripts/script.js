/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

import { timeDriver } from 'Animation';

export const Diagnostics = require('Diagnostics');
const Animation = require('Animation');
const DeviceMotion = require('DeviceMotion');
const Materials = require('Materials');
const NativeUI = require('NativeUI'); 
const Reactive = require('Reactive');
const Scene = require('Scene');
const Textures = require('Textures');
const TouchGestures = require('TouchGestures');

// 0: LOOP mode
// 1: TAP mode
// 2: COLOR mode
let effectMode = 0;
let counter = 0;
let isAnimated = () => effectMode === 0;
let isTappable = () => effectMode === 1;
let isColorable = () => effectMode === 2;
let intervalId;

const ORIENTATION_LEFT = 'ORIENTATION_LEFT';
const ORIENTATION_RIGHT = 'ORIENTATION_RIGHT';
const ORIENTATION_VERTICAL = 'ORIENTATION_VERTICAL';
let orientation;
const getRotationForOrientation = () => {
  if (orientation === ORIENTATION_LEFT) {
    return -1 * Math.PI / 2;
  } else if (orientation === ORIENTATION_VERTICAL) {
    return 0;
  } else if (orientation === ORIENTATION_RIGHT) {
    return Math.PI / 2;
  } else {
    return 0;
  }
}

const ART_ANIMATION_DURATION_MS = 500;
const ROTATION_ANIMATION_DURATION_MS = 150;
const INITIAL_HUE = 0.5;
const artNames = [
  'botticelli', 
  'fridaKahlo', 
  'meltingClocks', 
  'michaelangelo', 
  'mona-lisa', 
  'mondrian', 
  'monet', 
  'pearlEarring', 
  'scream', 
  'starryNight', 
  'sundayAfternoon', 
  'wave',
];

const getColorTexture = (hue) => Reactive.HSVA(hue, 1.0, 1.0, 1.0).toRGBA();

(async function () {
  // load objects
  const artTextures = await Promise.all(artNames.map(x => Textures.findFirst(x)));
  const [
    target, 
    matArt, 
    matColor, 
  ] = await Promise.all([
    Scene.root.findFirst('art'),
    Materials.findFirst('artMaterial'),
    Materials.findFirst('colorMaterial'),
  ]);
  const buttons = await Promise.all([
    Scene.root.findFirst('button0'),
    Scene.root.findFirst('button1'),
    Scene.root.findFirst('button2'),
  ]);
  const buttonLabels = await Promise.all([
    Scene.root.findFirst('buttonText0'),
    Scene.root.findFirst('buttonText1'),
    Scene.root.findFirst('buttonText2'),
  ]);

  // define animations
  const inc = async () => {
    counter = (counter + 1) % artNames.length;
    matArt.diffuse = artTextures[counter];
  };

  const startAnimation = () => {
    if (intervalId != null) {
      clearInterval(intervalId);
    }
    return setInterval(inc, ART_ANIMATION_DURATION_MS);
  }

  TouchGestures.onTap().subscribe(_ => {
    if (isTappable()) {
      inc();
    }
  });

  // sync control rotation with device orientation
  const setButtonTransforms = (newOrientation) => {
    const oldRotZ = getRotationForOrientation();
    orientation = newOrientation;
    const newRotZ = getRotationForOrientation();

    const rotationTimeDriver = Animation.timeDriver({
      durationMilliseconds: ROTATION_ANIMATION_DURATION_MS,
    });
    const linearSampler = Animation.samplers.linear(oldRotZ, newRotZ);
    const animation = Animation.animate(rotationTimeDriver, linearSampler);
    buttons.forEach(button => button.transform.rotationZ = animation);
    buttonLabels.forEach(buttonLabel => buttonLabel.transform.rotationZ = animation);
    rotationTimeDriver.start();
  };

  DeviceMotion.worldTransform.rotationZ.monitor().subscribe(async ({newValue}) => {
    const threshold = Math.PI / 4;
    // switch to left horizontal
    if (newValue > threshold && orientation !== ORIENTATION_LEFT) {
      // orientation = ORIENTATION_LEFT;
      setButtonTransforms(ORIENTATION_LEFT)
      // setButtonTransforms(0, -1 * Math.PI / 2);
    } // switch to vertical
    else if (newValue > 0 && newValue < threshold && orientation !== ORIENTATION_VERTICAL) {
      // setButtonTransforms(0, 0);
      // orientation = ORIENTATION_VERTICAL;
      setButtonTransforms(ORIENTATION_VERTICAL)
    } // switch to right horizontal
    else if (newValue < -1 * threshold && orientation !== ORIENTATION_RIGHT) {
      // setButtonTransforms(0, Math.PI / 2);
      // orientation = ORIENTATION_RIGHT;
      setButtonTransforms(ORIENTATION_RIGHT)
    }
  });

  // RGB slider setup
  const sliderRed = NativeUI.slider; 
  sliderRed.value = INITIAL_HUE;
  sliderRed.visible = isColorable();
  sliderRed.value.monitor().subscribe(async ({newValue}) => {
    matColor.diffuseColorFactor = getColorTexture(newValue);
  });

  // mode picker setup
  const updateEffectMode = async (newVal) => {
    effectMode = newVal;
    if (isAnimated()) {
      intervalId = startAnimation();
    } else if (intervalId != null) {
      clearInterval(intervalId);
    }

    buttonLabels.forEach((buttonLabel, idx) => buttonLabel.hidden = effectMode != idx);
    target.material = isColorable() ? matColor : matArt;
    sliderRed.visible = isColorable();
  };

  buttons.map((button, idx) => 
    TouchGestures.onTap(button).subscribe(_ => updateEffectMode(idx))
  );

  // set initial values
  buttonLabels[effectMode].hidden = false;
  buttonLabels.slice(1).forEach(buttonLabel => buttonLabel.hidden = true);
  matColor.diffuseColorFactor = getColorTexture(INITIAL_HUE);
  if (isAnimated()) {
    intervalId = startAnimation();
  }
})();
